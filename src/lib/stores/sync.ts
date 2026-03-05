import { writable, get } from 'svelte/store';

const PUBLIC_GOOGLE_CLIENT_ID: string = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID ?? '';
import * as drive from '$lib/services/gdrive';
import * as storage from '$lib/services/storage';
import { articles } from '$lib/stores/articles';
import { readerSettings, READER_SETTINGS_UPDATED_AT_KEY } from '$lib/stores/reader';
import { appTheme, applyTheme, APP_THEME_UPDATED_AT_KEY } from '$lib/stores/theme';
import type { SyncFile } from '$lib/types';

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_CONNECTED = 'gdrive_connected';
const LS_FILE_ID = 'gdrive_file_id';
const LS_LAST_SYNCED = 'gdrive_last_synced';

function loadFileId(): string | null { return localStorage.getItem(LS_FILE_ID); }
function saveFileId(id: string): void { localStorage.setItem(LS_FILE_ID, id); }
function loadLastSynced(): number | null { const v = localStorage.getItem(LS_LAST_SYNCED); return v ? parseInt(v) : null; }
function loadInt(key: string): number {
	return parseInt(localStorage.getItem(key) ?? '0') || 0;
}

// ─── Reactive state ───────────────────────────────────────────────────────────

export type SyncStatus = 'disconnected' | 'idle' | 'syncing' | 'success' | 'error';

// Start as 'idle' if the user previously connected, avoiding a UI flash on load
const initialStatus: SyncStatus = (() => {
	try { return localStorage.getItem(LS_CONNECTED) ? 'idle' : 'disconnected'; } catch { return 'disconnected'; }
})();

export const syncStatus = writable<SyncStatus>(initialStatus);
export const syncError = writable<string>('');
export const lastSynced = writable<number | null>(null);

// ─── Public API ───────────────────────────────────────────────────────────────

export async function initSync(): Promise<void> {
	if (!PUBLIC_GOOGLE_CLIENT_ID) return;
	if (!localStorage.getItem(LS_CONNECTED)) return;
	lastSynced.set(loadLastSynced());
	try {
		await drive.loadGisScript();
		await performSync(true);
	} catch {
		syncStatus.set('idle');
	}
}

export async function connectDrive(): Promise<void> {
	localStorage.setItem(LS_CONNECTED, '1');
	await drive.loadGisScript();
	await performSync(false);
}

export function disconnectDrive(): void {
	localStorage.removeItem(LS_CONNECTED);
	localStorage.removeItem(LS_FILE_ID);
	localStorage.removeItem(LS_LAST_SYNCED);
	drive.clearTokenCache();
	syncStatus.set('disconnected');
	lastSynced.set(null);
	syncError.set('');
}

export async function manualSync(): Promise<void> {
	await performSync(false);
}

// ─── Core sync routine ────────────────────────────────────────────────────────

async function performSync(silent: boolean): Promise<void> {
	syncStatus.set('syncing');
	syncError.set('');

	try {
		const token = await drive.getAccessToken(PUBLIC_GOOGLE_CLIENT_ID, silent);

		// 1. Find / download remote sync file
		let fileId = loadFileId();
		let remote: SyncFile | null = null;

		if (fileId) {
			try {
				remote = await drive.downloadSyncFile(token, fileId);
			} catch {
				fileId = null; // file may have been deleted
			}
		}
		if (!fileId) {
			fileId = await drive.findSyncFile(token);
			if (fileId) remote = await drive.downloadSyncFile(token, fileId);
		}

		// 2. Gather full local state
		const localArticles = await storage.getAllArticles();
		const localReaderSettings = get(readerSettings);
		const localReaderSettingsUpdatedAt = loadInt(READER_SETTINGS_UPDATED_AT_KEY);
		const localAppTheme = get(appTheme);
		const localAppThemeUpdatedAt = loadInt(APP_THEME_UPDATED_AT_KEY);

		const localProgress: Record<string, number> = {};
		const localLastOpened: Record<string, number> = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)!;
			if (key.startsWith('readprogress:')) {
				localProgress[key.replace('readprogress:', '')] = loadInt(key);
			} else if (key.startsWith('lastopenat:')) {
				localLastOpened[key.replace('lastopenat:', '')] = loadInt(key);
			}
		}

		// 3. Merge articles
		const mergedArticles = remote ? drive.mergeArticles(localArticles, remote.articles) : localArticles;

		// 4. Merge settings (remote wins if newer)
		let mergedReaderSettings = localReaderSettings;
		let mergedReaderSettingsUpdatedAt = localReaderSettingsUpdatedAt;
		if (remote?.readerSettings && remote.readerSettings.updatedAt > localReaderSettingsUpdatedAt) {
			const { updatedAt, ...settings } = remote.readerSettings;
			mergedReaderSettings = settings;
			mergedReaderSettingsUpdatedAt = updatedAt;
			readerSettings.set(settings);
			localStorage.setItem('readerSettings', JSON.stringify(settings));
			localStorage.setItem(READER_SETTINGS_UPDATED_AT_KEY, String(updatedAt));
		}

		let mergedAppTheme = localAppTheme;
		let mergedAppThemeUpdatedAt = localAppThemeUpdatedAt;
		if (remote?.appTheme && remote.appTheme.updatedAt > localAppThemeUpdatedAt) {
			mergedAppTheme = remote.appTheme.value;
			mergedAppThemeUpdatedAt = remote.appTheme.updatedAt;
			appTheme.set(remote.appTheme.value);
			applyTheme(remote.appTheme.value);
			localStorage.setItem('appTheme', remote.appTheme.value);
			localStorage.setItem(APP_THEME_UPDATED_AT_KEY, String(remote.appTheme.updatedAt));
		}

		// 5. Merge progress and lastOpened (max wins)
		const mergedProgress: Record<string, number> = { ...localProgress };
		if (remote?.readingProgress) {
			for (const [id, val] of Object.entries(remote.readingProgress)) {
				mergedProgress[id] = Math.max(mergedProgress[id] ?? 0, val);
			}
		}
		const mergedLastOpened: Record<string, number> = { ...localLastOpened };
		if (remote?.lastOpenedAt) {
			for (const [id, val] of Object.entries(remote.lastOpenedAt)) {
				mergedLastOpened[id] = Math.max(mergedLastOpened[id] ?? 0, val);
			}
		}

		// 6. Write merged articles to IndexedDB
		const localMap = new Map(localArticles.map((a) => [a.id, a]));
		for (const m of mergedArticles) {
			const l = localMap.get(m.id);
			if (!l) {
				await storage.saveArticle(m);
			} else if (
				l.isRead !== m.isRead ||
				l.archived !== m.archived ||
				JSON.stringify(l.tags) !== JSON.stringify(m.tags)
			) {
				await storage.updateArticle(m.id, {
					isRead: m.isRead,
					archived: m.archived,
					tags: m.tags,
					updatedAt: m.updatedAt
				});
			}
		}

		// 7. Write merged progress / lastOpened to localStorage
		for (const [id, val] of Object.entries(mergedProgress)) {
			localStorage.setItem(`readprogress:${id}`, String(val));
		}
		for (const [id, val] of Object.entries(mergedLastOpened)) {
			localStorage.setItem(`lastopenat:${id}`, String(val));
		}

		// 8. Refresh Svelte article store
		const refreshed = await storage.getAllArticles();
		articles.set(refreshed);

		// 9. Upload merged state to Drive
		const syncFile: SyncFile = {
			version: 1,
			exportedAt: Date.now(),
			articles: mergedArticles,
			readerSettings: { ...mergedReaderSettings, updatedAt: mergedReaderSettingsUpdatedAt },
			appTheme: { value: mergedAppTheme, updatedAt: mergedAppThemeUpdatedAt },
			readingProgress: mergedProgress,
			lastOpenedAt: mergedLastOpened
		};
		const newFileId = await drive.uploadSyncFile(token, syncFile, fileId);
		saveFileId(newFileId);

		const now = Date.now();
		localStorage.setItem(LS_LAST_SYNCED, String(now));
		lastSynced.set(now);
		syncStatus.set('success');
	} catch (e) {
		if (silent) {
			syncStatus.set('idle');
		} else {
			syncError.set(e instanceof Error ? e.message : 'Sync failed');
			syncStatus.set('error');
		}
	}
}
