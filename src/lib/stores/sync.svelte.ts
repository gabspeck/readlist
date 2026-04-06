import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
import * as drive from '$lib/services/gdrive';
import * as storage from '$lib/services/storage';
import { articles } from '$lib/stores/articles.svelte';
import { reader, READER_SETTINGS_UPDATED_AT_KEY } from '$lib/stores/reader.svelte';
import { theme, applyTheme, APP_THEME_UPDATED_AT_KEY } from '$lib/stores/theme.svelte';
import type { Article, SyncFile } from '$lib/types';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type SyncStatus = 'disconnected' | 'idle' | 'syncing' | 'success' | 'error' | 'needs_auth';

function articleSnapshot(list: Article[]): string {
	return JSON.stringify(list.map((a) => [a.id, a.isRead, a.archived, a.tags]));
}

// ─── Sync state class ─────────────────────────────────────────────────────────

const initialStatus: SyncStatus = (() => {
	try { return localStorage.getItem(LS_CONNECTED) ? 'idle' : 'disconnected'; } catch { return 'disconnected'; }
})();

class SyncState {
	status = $state<SyncStatus>(initialStatus);
	error = $state('');
	lastSynced = $state<number | null>(null);
	hasPendingChanges = $state<boolean>(
		(() => { try { return !!localStorage.getItem(LS_CONNECTED); } catch { return false; } })()
	);

	markPending(): void {
		if (localStorage.getItem(LS_CONNECTED)) this.hasPendingChanges = true;
	}

	private watchForPending(): void {
		let prevArticles = articleSnapshot(articles.items);
		let prevReader = JSON.stringify(reader.settings);
		let prevTheme = theme.current;

		$effect.root(() => {
			$effect(() => {
				const snap = articleSnapshot(articles.items);
				if (snap === prevArticles) return;
				prevArticles = snap;
				this.markPending();
			});
			$effect(() => {
				const snap = JSON.stringify(reader.settings);
				if (snap === prevReader) return;
				prevReader = snap;
				this.markPending();
			});
			$effect(() => {
				if (theme.current === prevTheme) return;
				prevTheme = theme.current;
				this.markPending();
			});
		});
	}

	// ─── Public API ───────────────────────────────────────────────────────────

	async init(): Promise<void> {
		if (!PUBLIC_GOOGLE_CLIENT_ID) return;
		if (!localStorage.getItem(LS_CONNECTED)) return;
		this.lastSynced = loadLastSynced();
		drive.loadGisScript().catch(() => {}); // preload in background
		if (drive.hasValidToken()) {
			try { await this.performSync(true); } catch { this.status = 'idle'; }
		}
		this.watchForPending();
	}

	async connect(): Promise<void> {
		localStorage.setItem(LS_CONNECTED, '1');
		await drive.loadGisScript();
		await this.performSync(false);
		this.watchForPending();
	}

	disconnect(): void {
		localStorage.removeItem(LS_CONNECTED);
		localStorage.removeItem(LS_FILE_ID);
		localStorage.removeItem(LS_LAST_SYNCED);
		drive.clearTokenCache();
		this.status = 'disconnected';
		this.lastSynced = null;
		this.error = '';
		this.hasPendingChanges = false;
	}

	async manualSync(): Promise<void> {
		await this.performSync(false);
	}

	// ─── Core sync routine ────────────────────────────────────────────────────

	private async performSync(silent: boolean): Promise<void> {
		this.status = 'syncing';
		this.error = '';

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
			const localArticles = articles.items;
			const localReaderSettings = reader.settings;
			const localReaderSettingsUpdatedAt = loadInt(READER_SETTINGS_UPDATED_AT_KEY);
			const localAppTheme = theme.current;
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
				reader.settings = settings;
				localStorage.setItem('readerSettings', JSON.stringify(settings));
				localStorage.setItem(READER_SETTINGS_UPDATED_AT_KEY, String(updatedAt));
			}

			let mergedAppTheme = localAppTheme;
			let mergedAppThemeUpdatedAt = localAppThemeUpdatedAt;
			if (remote?.appTheme && remote.appTheme.updatedAt > localAppThemeUpdatedAt) {
				mergedAppTheme = remote.appTheme.value;
				mergedAppThemeUpdatedAt = remote.appTheme.updatedAt;
				theme.current = remote.appTheme.value;
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
			articles.items = refreshed;

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
			this.lastSynced = now;
			this.status = 'success';
			this.hasPendingChanges = false;
		} catch (e) {
			if (silent) {
				this.status = 'needs_auth';
			} else {
				this.error = e instanceof Error ? e.message : 'Sync failed';
				this.status = 'error';
			}
		}
	}
}

export const sync = new SyncState();
