<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
	import { settings } from '$lib/stores/settings.svelte';
	import { getAllArticles } from '$lib/services/storage';
	import { saveArticle } from '$lib/services/storage';
	import { sync } from '$lib/stores/sync.svelte';

	let proxyValue = $state(settings.corsProxy);
	let saved = $state(false);
	let lastExportedAt = $state<number | null>(
		typeof localStorage !== 'undefined'
			? (parseInt(localStorage.getItem('lastBackupAt') ?? '') || null)
			: null
	);

	let connecting = $state(false);
	let syncing = $state(false);

	async function handleConnect(): Promise<void> {
		connecting = true;
		try { await sync.connect(); }
		finally { connecting = false; }
	}

	async function handleSync(): Promise<void> {
		syncing = true;
		try { await sync.manualSync(); }
		finally { syncing = false; }
	}

	function formatTs(ts: number | null): string {
		if (!ts) return 'Never';
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
	}

	let bookmarkletHref = $derived.by(() => {
		if (typeof window === 'undefined') return '#';
		const origin = window.location.origin;
		const js = `(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.min.js';s.onload=function(){var doc=document.cloneNode(true);var r=new Readability(doc);var a=r.parse();if(!a){alert('Readlist: could not parse this page.');return;}var data={url:location.href,title:a.title||document.title,author:a.byline||'',content:a.content||'',excerpt:a.excerpt||'',siteName:a.siteName||location.hostname,wordCount:a.length||0,publishedAt:null};location.href='${origin}/import#'+btoa(encodeURIComponent(JSON.stringify(data)));};document.head.appendChild(s);})();`;
		return 'javascript:' + js;
	});

	function saveProxy(): void {
		settings.corsProxy = proxyValue.trim();
		saved = true;
		setTimeout(() => { saved = false; }, 2000);
	}

	async function exportData(): Promise<void> {
		const articles = await getAllArticles();
		const json = JSON.stringify(articles, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `readlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
		const now = Date.now();
		localStorage.setItem('lastBackupAt', String(now));
		lastExportedAt = now;
	}

	async function importData(e: Event): Promise<void> {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const articles = JSON.parse(text);
			if (!Array.isArray(articles)) throw new Error('Invalid format');

			let count = 0;
			for (const a of articles) {
				if (a.id && a.url && a.title) {
					await saveArticle(a);
					count++;
				}
			}
			alert(`Imported ${count} articles. Reload to see them.`);
		} catch {
			alert('Import failed: invalid file format.');
		}

		input.value = '';
	}
</script>

<div class="settings-shell">
	<header class="settings-header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<h1 class="settings-title">Settings</h1>
	</header>

	<main class="settings-main">
		<section class="settings-section">
			<h2 class="section-title">CORS Proxy</h2>
			<p class="section-desc">
				A CORS proxy is required to fetch articles. You can use a public proxy or
				<a href="https://github.com/nickspaargaren/no-cors" target="_blank" rel="noopener noreferrer">self-host one</a>.
			</p>
			<div class="proxy-row">
				<input
					type="url"
					bind:value={proxyValue}
					class="proxy-input"
					placeholder="/api/proxy?url="
					spellcheck={false}
					autocomplete="off"
				/>
				<button class="btn-save" onclick={saveProxy}>
					{saved ? 'Saved!' : 'Save'}
				</button>
			</div>
		</section>

		<section class="settings-section">
			<h2 class="section-title">Data</h2>
			<p class="section-desc">
				All your data is stored locally on this device.
				Last exported: {formatTs(lastExportedAt)}.
			</p>
			<div class="data-buttons">
				<button class="btn-secondary" onclick={exportData}>
					Export backup (JSON)
				</button>
				<label class="btn-secondary file-label">
					Import backup
					<input type="file" accept=".json" class="file-input" onchange={importData} />
				</label>
			</div>
		</section>

		{#if PUBLIC_GOOGLE_CLIENT_ID}
		<section class="settings-section">
			<h2 class="section-title">Google Drive Sync</h2>

			{#if sync.status !== 'disconnected'}
				<p class="section-desc">
					Syncing to Google Drive. Last synced: {formatTs(sync.lastSynced)}.
				</p>
					<div class="data-buttons">
					<button
						class="btn-secondary"
						onclick={handleSync}
						disabled={syncing || sync.status === 'syncing'}
					>
						{syncing || sync.status === 'syncing' ? 'Syncing…' : 'Sync now'}
					</button>
					<button class="btn-secondary" onclick={() => sync.disconnect()}>Disconnect</button>
				</div>
			{:else}
				<p class="section-desc">
					Sync your reading list and settings across devices using your Google Drive storage.
				</p>
				<div class="data-buttons">
					<button class="btn-save" onclick={handleConnect} disabled={connecting}>
						{connecting ? 'Connecting…' : 'Connect Google Drive'}
					</button>
				</div>
			{/if}
		</section>
		{/if}

		<section class="settings-section">
			<h2 class="section-title">Bookmarklet</h2>
			<p class="section-desc">
				Save paywalled or subscriber-only articles directly from your browser — no proxy needed.
				Drag the button below to your bookmarks bar, then click it on any page.
			</p>
			<div class="bookmarklet-row">
				<a
					href={bookmarkletHref}
					class="bookmarklet-btn"
					onclick={(e) => e.preventDefault()}
					title="Drag this to your bookmarks bar"
					draggable={true}
				>
					<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
					Save to Readlist
				</a>
				<p class="bookmarklet-hint">Drag to bookmarks bar</p>
			</div>
			<p class="section-desc" style="margin-top: 0.75rem; margin-bottom: 0">
				The bookmarklet runs entirely in your browser using your existing login session,
				so it works on sites where you have a subscription.
			</p>
		</section>

		<section class="settings-section">
			<h2 class="section-title">About</h2>
			<p class="section-desc">
				Readlist is a free, open-source read-later app.<br>
				No accounts. No telemetry. Your articles stay on your device.
			</p>
		</section>
	</main>
</div>

<style>
	.settings-shell {
		height: 100%;
		background: var(--color-bg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.settings-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 1rem;
		height: var(--nav-height);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-sm);
	}

	.back-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.settings-title {
		font-size: 1rem;
		font-weight: 600;
	}

	.settings-main {
		flex: 1;
		max-width: 600px;
		width: 100%;
		margin: 0 auto;
		padding: 0 1rem 4rem;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		min-height: 0;
	}

	.settings-section {
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}

	.section-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		margin-bottom: 0.875rem;
	}

	.section-desc a {
		color: var(--color-accent);
	}

	.proxy-row {
		display: flex;
		gap: 0.5rem;
	}

	.proxy-input {
		flex: 1;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.875rem;
		outline: none;
		min-width: 0;
	}

	.proxy-input:focus {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
	}

	.btn-save {
		padding: 0.625rem 1rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		min-height: 44px;
	}

	.btn-save:hover {
		background: var(--color-accent-hover);
	}

	.data-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.btn-secondary {
		padding: 0.625rem 1rem;
		background: var(--color-surface-raised);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
	}

	.file-label {
		display: inline-flex;
		align-items: center;
	}

	.file-input {
		display: none;
	}

	.bookmarklet-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.bookmarklet-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 1rem;
		background: var(--color-accent);
		color: #fff;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		cursor: grab;
		user-select: none;
		min-height: 44px;
	}

	.bookmarklet-btn:hover {
		background: var(--color-accent-hover);
	}

	.bookmarklet-hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}
</style>
