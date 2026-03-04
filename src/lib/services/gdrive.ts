import type { Article, SyncFile } from '$lib/types';

// ─── GIS script ──────────────────────────────────────────────────────────────

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function loadGisScript(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof google !== 'undefined') { resolve(); return; }
		if (document.querySelector(`script[src="${GIS_SRC}"]`)) {
			// Already injected, wait for global to appear
			const interval = setInterval(() => {
				if (typeof google !== 'undefined') { clearInterval(interval); resolve(); }
			}, 50);
			setTimeout(() => { clearInterval(interval); reject(new Error('GIS script timed out')); }, 10_000);
			return;
		}
		const script = document.createElement('script');
		script.src = GIS_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load GIS script'));
		document.head.appendChild(script);
	});
}

// ─── Token management ─────────────────────────────────────────────────────────

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

interface GisToken {
	access_token: string;
	expires_at: number;
}

let cachedToken: GisToken | null = null;

export function getAccessToken(clientId: string, silent = false): Promise<string> {
	if (cachedToken && cachedToken.expires_at - Date.now() > 60_000) {
		return Promise.resolve(cachedToken.access_token);
	}

	return new Promise((resolve, reject) => {
		const client = google.accounts.oauth2.initTokenClient({
			client_id: clientId,
			scope: DRIVE_SCOPE,
			callback: (response) => {
				if (response.error) { reject(new Error(response.error)); return; }
				cachedToken = {
					access_token: response.access_token,
					expires_at: Date.now() + Number(response.expires_in) * 1000
				};
				resolve(cachedToken.access_token);
			},
			error_callback: (err) => reject(new Error(err.message ?? 'GIS error'))
		});
		// prompt:'' = skip consent screen if already granted (silent-ish)
		// prompt:'none' would fully suppress popup but causes errors in some cases
		client.requestAccessToken({ prompt: silent ? '' : undefined });
	});
}

export function clearTokenCache(): void {
	cachedToken = null;
}

// ─── Drive REST API ───────────────────────────────────────────────────────────

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FILE_NAME = 'readlist-sync.json';

function authHeaders(token: string): Record<string, string> {
	return { Authorization: `Bearer ${token}` };
}

export async function findSyncFile(token: string): Promise<string | null> {
	const params = new URLSearchParams({
		spaces: 'appDataFolder',
		fields: 'files(id)',
		q: `name = '${FILE_NAME}'`
	});
	const res = await fetch(`${DRIVE_API}/files?${params}`, { headers: authHeaders(token) });
	if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
	const data = await res.json();
	return (data.files as { id: string }[])?.[0]?.id ?? null;
}

export async function downloadSyncFile(token: string, fileId: string): Promise<SyncFile> {
	const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: authHeaders(token) });
	if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
	return res.json() as Promise<SyncFile>;
}

export async function uploadSyncFile(
	token: string,
	data: SyncFile,
	existingFileId: string | null
): Promise<string> {
	const metadata: Record<string, unknown> = { name: FILE_NAME };
	if (!existingFileId) metadata.parents = ['appDataFolder'];

	const body = new FormData();
	body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
	body.append('media', new Blob([JSON.stringify(data)], { type: 'application/json' }));

	const url = existingFileId
		? `${UPLOAD_API}/files/${existingFileId}?uploadType=multipart`
		: `${UPLOAD_API}/files?uploadType=multipart`;

	const res = await fetch(url, {
		method: existingFileId ? 'PATCH' : 'POST',
		headers: authHeaders(token),
		body
	});
	if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
	const json = await res.json();
	return json.id as string;
}

// ─── Merge algorithm ──────────────────────────────────────────────────────────

export function mergeArticles(local: Article[], remote: Article[]): Article[] {
	const merged = new Map<string, Article>();

	for (const a of local) merged.set(a.id, a);

	for (const r of remote) {
		const l = merged.get(r.id);
		if (!l) {
			merged.set(r.id, r);
		} else {
			const localTs = l.updatedAt ?? l.savedAt;
			const remoteTs = r.updatedAt ?? r.savedAt;
			if (remoteTs > localTs) {
				// Remote wins on mutable fields; keep local for immutable content
				merged.set(r.id, {
					...l,
					isRead: r.isRead,
					archived: r.archived,
					tags: r.tags,
					updatedAt: remoteTs
				});
			}
		}
	}

	return [...merged.values()].sort((a, b) => b.savedAt - a.savedAt);
}
