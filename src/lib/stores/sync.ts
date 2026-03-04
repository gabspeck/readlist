import { writable, get } from 'svelte/store';
import * as drive from '$lib/services/gdrive';
import * as storage from '$lib/services/storage';
import { articles } from '$lib/stores/articles';
import { readerSettings, READER_SETTINGS_UPDATED_AT_KEY } from '$lib/stores/reader';
import { appTheme, applyTheme, APP_THEME_UPDATED_AT_KEY } from '$lib/stores/theme';
import type { SyncFile } from '$lib/types';

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_CLIENT_ID = 'gdrive_client_id';
const LS_FILE_ID = 'gdrive_file_id';

function loadClientId(): string { return localStorage.getItem(LS_CLIENT_ID) ?? ''; }
function saveClientId(id: string): void { localStorage.setItem(LS_CLIENT_ID, id); }
function loadFileId(): string | null { return localStorage.getItem(LS_FILE_ID); }
function saveFileId(id: string): void { localStorage.setItem(LS_FILE_ID, id); }
function loadInt(key: string): number {
	return parseInt(localStorage.getItem(key) ?? '0') || 0;
}

// ─── Reactive state ───────────────────────────────────────────────────────────

export type SyncStatus = 'disconnected' | 'idle' | 'syncing' | 'success' | 'error';

export const syncStatus = writable<SyncStatus>('disconnected');
export const syncError = writable<string>('');
export const lastSynced = writable<number | null>(null);
export const syncClientId = writable<string>('');

// ─── Public API ───────────────────────────────────────────────────────────────

export async function initSync(): Promise<void> {
	const clientId = loadClientId();
	if (!clientId) return;
	syncClientId.set(clientId);
	try {
		await drive.loadGisScript();
		await performSync(clientId, true);
	} catch {
		syncStatus.set('idle');
	}
}

export async function connectDrive(clientId: string): Promise<void> {
	saveClientId(clientId);
	syncClientId.set(clientId);
	await drive.loadGisScript();
	await performSync(clientId, false);
}

export function disconnectDrive(): void {
	localStorage.removeItem(LS_CLIENT_ID);
	localStorage.removeItem(LS_FILE_ID);
	drive.clearTokenCache();
	syncClientId.set('');
	syncStatus.set('disconnected');
	lastSynced.set(null);
	syncError.set('');
}

export async function manualSync(): Promise<void> {
	const clientId = get(syncClientId);
	if (!clientId) return;
	await performSync(clientId, false);
}

// ─── Core sync routine ────────────────────────────────────────────────────────

async function performSync(clientId: string, silent: boolean): Promise<void> {
	syncStatus.set('syncing');
	syncError.set('');

	try {
		const token = await drive.getAccessToken(clientId, silent);

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

		lastSynced.set(Date.now());
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
