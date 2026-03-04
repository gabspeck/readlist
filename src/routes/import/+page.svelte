<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { saveArticle } from '$lib/services/storage';
	import { loadArticles } from '$lib/stores/articles';
	import type { Article } from '$lib/types';

	type ImportState = 'idle' | 'preview' | 'saving' | 'saved' | 'error';

	let status = $state<ImportState>('idle');
	let errorMsg = $state('');
	let preview = $state<Partial<Article> | null>(null);

	onMount(() => {
		const hash = location.hash.slice(1);
		if (!hash) {
			status = 'idle';
			return;
		}
		try {
			const decoded = JSON.parse(decodeURIComponent(atob(hash)));
			if (!decoded.url || !decoded.title) throw new Error('Missing required fields');
			preview = decoded;
			status = 'preview';
		} catch {
			errorMsg = 'Could not decode the article data. Try using the bookmarklet again.';
			status = 'error';
		}
	});

	async function saveArticleData(): Promise<void> {
		if (!preview) return;
		status = 'saving';
		try {
			const article: Article = {
				id: crypto.randomUUID(),
				url: preview.url ?? '',
				title: preview.title ?? 'Untitled',
				author: preview.author ?? '',
				publishedAt: preview.publishedAt ?? null,
				excerpt: preview.excerpt ?? '',
				content: preview.content ?? '',
				savedAt: Date.now(),
				isRead: false,
				tags: [],
				archived: false,
				siteName: preview.siteName ?? '',
				wordCount: preview.wordCount ?? 0
			};
			await saveArticle(article);
			await loadArticles();
			status = 'saved';
			setTimeout(() => goto('/'), 1200);
		} catch {
			errorMsg = 'Failed to save the article. Please try again.';
			status = 'error';
		}
	}
</script>

<div class="import-shell">
	<header class="import-header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<h1 class="import-title">Save article</h1>
	</header>

	<main class="import-main">
		{#if status === 'idle'}
			<div class="import-empty">
				<p>No article data found.</p>
				<p class="hint">Use the Readlist bookmarklet on any page to save it here.</p>
				<a href="/settings" class="btn-primary">Get bookmarklet</a>
			</div>

		{:else if status === 'preview' && preview}
			<div class="preview-card">
				<p class="preview-source">{preview.siteName || new URL(preview.url ?? '').hostname}</p>
				<h2 class="preview-title">{preview.title}</h2>
				{#if preview.author}
					<p class="preview-author">{preview.author}</p>
				{/if}
				{#if preview.excerpt}
					<p class="preview-excerpt">{preview.excerpt}</p>
				{/if}
				<a href={preview.url} target="_blank" rel="noopener noreferrer" class="preview-url">
					{preview.url}
				</a>
			</div>
			<div class="import-actions">
				<button class="btn-primary" onclick={saveArticleData}>
					Save to Readlist
				</button>
				<button class="btn-secondary" onclick={() => goto('/')}>
					Discard
				</button>
			</div>

		{:else if status === 'saving'}
			<div class="import-empty">
				<p>Saving…</p>
			</div>

		{:else if status === 'saved'}
			<div class="import-empty success">
				<svg width="40" height="40" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<circle cx="10" cy="10" r="8" stroke="var(--color-accent)" stroke-width="1.5"/>
					<path d="M6.5 10l2.5 2.5 4.5-5" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<p>Article saved!</p>
			</div>

		{:else if status === 'error'}
			<div class="import-empty error">
				<p>Something went wrong</p>
				<p class="hint">{errorMsg}</p>
				<a href="/" class="btn-secondary">Go home</a>
			</div>
		{/if}
	</main>
</div>

<style>
	.import-shell {
		min-height: 100vh;
		background: var(--color-bg);
		color: var(--color-text);
	}

	.import-header {
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

	.import-title {
		font-size: 1rem;
		font-weight: 600;
	}

	.import-main {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}

	.import-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.import-empty.success {
		color: var(--color-text);
	}

	.import-empty.error {
		color: var(--color-text);
	}

	.hint {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.preview-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.preview-source {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.preview-title {
		font-size: 1.125rem;
		font-weight: 700;
		line-height: 1.3;
		margin-bottom: 0.375rem;
		color: var(--color-text);
	}

	.preview-author {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin-bottom: 0.75rem;
	}

	.preview-excerpt {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.preview-url {
		font-size: 0.75rem;
		color: var(--color-accent);
		word-break: break-all;
		text-decoration: none;
	}

	.preview-url:hover {
		text-decoration: underline;
	}

	.import-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}

	.btn-primary:hover {
		background: var(--color-accent-hover);
	}

	.btn-secondary {
		padding: 0.75rem 1.5rem;
		background: var(--color-surface-raised);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
	}
</style>
