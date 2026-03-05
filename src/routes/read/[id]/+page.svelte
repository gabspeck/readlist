<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { readerSettings, initReaderSettings } from '$lib/stores/reader';
	import { markRead } from '$lib/stores/articles';
	import { getArticle } from '$lib/services/storage';
	import ReaderControls from '$lib/components/ReaderControls.svelte';
	import { copyToClipboard } from '$lib/services/share';
	import type { Article } from '$lib/types';

	let article = $state<Article | null>(null);
	let notFound = $state(false);
	let showControls = $state(false);
	let webView = $state(false);
	let progress = $state(0);
	let articleEl = $state<HTMLElement | undefined>(undefined);

	const id = $derived($page.params.id ?? '');

	function progressKey(articleId: string): string {
		return `readprogress:${articleId}`;
	}

	function saveProgress(articleId: string, pct: number): void {
		localStorage.setItem(progressKey(articleId), String(pct));
	}

	function restoreScrollPosition(articleId: string): void {
		if (!articleEl) return;
		const saved = localStorage.getItem(progressKey(articleId));
		if (!saved) return;
		const pct = parseInt(saved) / 100;
		const total = articleEl.scrollHeight - articleEl.clientHeight;
		if (total > 0) articleEl.scrollTo({ top: pct * total, behavior: 'instant' });
	}

	function clearProgress(articleId: string): void {
		localStorage.removeItem(progressKey(articleId));
	}

	onMount(() => {
		initReaderSettings();

		let cleanup: (() => void) | undefined;

		getArticle(id).then((found) => {
			if (!found) {
				notFound = true;
				return;
			}
			article = found;

			localStorage.setItem(`lastopenat:${id}`, String(Date.now()));

			let saveTimer: ReturnType<typeof setTimeout> | undefined;

			const handleScroll = () => {
				if (!articleEl) return;
				const total = articleEl.scrollHeight - articleEl.clientHeight;
				if (total <= 0) { progress = 100; return; }
				progress = Math.min(100, Math.max(0, Math.round((articleEl.scrollTop / total) * 100)));

				// Throttle saves to every 500 ms
				clearTimeout(saveTimer);
				saveTimer = setTimeout(() => saveProgress(id, progress), 500);

				// Clear saved position and mark read when finished
				if (progress === 100) {
					clearProgress(id);
					markRead(id, true);
				}
			};

			// Wait for {#if article} block to render before attaching listener
			requestAnimationFrame(() => {
				restoreScrollPosition(id);
				if (!articleEl) return;
				articleEl.addEventListener('scroll', handleScroll, { passive: true });
				cleanup = () => {
					articleEl?.removeEventListener('scroll', handleScroll);
					clearTimeout(saveTimer);
				};
			});
		});

		return () => cleanup?.();
	});

	function readingTime(wordCount: number): string {
		return `${Math.ceil(wordCount / 238)} min read`;
	}

	let copied = $state(false);

	async function shareArticle(): Promise<void> {
		if (!article) return;
		if (navigator.share) {
			await navigator.share({ title: article.title, url: article.url });
		} else {
			await copyToClipboard(article.url);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		}
	}

	let themeAttr = $derived(
		$readerSettings.theme === 'system' ? undefined : $readerSettings.theme
	);

	let readerStyle = $derived(
		`font-size: ${$readerSettings.fontSize}px; line-height: ${$readerSettings.lineHeight}; font-family: ${$readerSettings.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, sans-serif'};`
	);
</script>

{#if article}
<div class="reader-shell" data-theme={themeAttr}>
	<!-- Progress bar -->
	<div class="progress-bar" style="width: {progress}%" aria-hidden="true"></div>

	<!-- Top bar -->
	<header class="reader-header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back to list">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<span class="header-site">{article.siteName || new URL(article.url).hostname}</span>

		<button class="header-btn" aria-label="Share" onclick={shareArticle}>
			{#if copied}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<path d="M4 10l5 5L16 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<circle cx="15" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
					<circle cx="15" cy="16" r="2" stroke="currentColor" stroke-width="1.5"/>
					<circle cx="5" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
					<path d="M7 9l6-3.5M7 11l6 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>

		<!-- Reader / web-view toggle -->
		<button
			class="header-btn"
			class:active={!webView}
			aria-label={webView ? 'Switch to reader mode' : 'Switch to original web page'}
			title={webView ? 'Reader mode' : 'Original page'}
			onclick={() => { webView = !webView; showControls = false; }}
		>
			{#if webView}
				<!-- Book icon → back to reader -->
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<path d="M3 4a1 1 0 0 1 1-1h4.5C9.9 3 11 4.1 11 5.5V17l-4-2-4 2V4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
					<path d="M11 5.5C11 4.1 12.1 3 13.5 3H17a1 1 0 0 1 1 1v13l-4-2-3 1.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
				</svg>
			{:else}
				<!-- Globe icon → switch to web -->
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/>
					<path d="M10 2.5C10 2.5 7 6 7 10s3 7.5 3 7.5M10 2.5C10 2.5 13 6 13 10s-3 7.5-3 7.5M2.5 10h15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>

		{#if !webView}
			<button
				class="header-btn"
				aria-label="Reader settings"
				aria-expanded={showControls}
				onclick={() => showControls = !showControls}
			>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<path d="M3 6h14M6 10h8M9 14h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		{/if}
	</header>

	{#if showControls && !webView}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="controls-backdrop" onclick={() => showControls = false} onkeydown={(e) => e.key === 'Escape' && (showControls = false)}></div>
		<div class="controls-panel">
			<ReaderControls onClose={() => showControls = false} />
		</div>
	{/if}

	{#if webView}
		<!-- Original web page -->
		<iframe
			class="web-frame"
			src={article.url}
			title={article.title}
			sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
		></iframe>
	{:else}
		<!-- Reader mode content -->
		<main class="reader-main" bind:this={articleEl}>
			<div class="reader-content" style={readerStyle}>
				<div class="article-meta">
					{#if article.siteName}
						<a href={article.url} target="_blank" rel="noopener noreferrer" class="article-source">
							{article.siteName}
						</a>
					{/if}
					<h1 class="article-title">{article.title}</h1>
					<div class="article-byline">
						{#if article.author}<span>{article.author}</span>{/if}
						{#if article.publishedAt}<span>{new Date(article.publishedAt).toLocaleDateString()}</span>{/if}
						{#if article.wordCount}<span>{readingTime(article.wordCount)}</span>{/if}
					</div>
				</div>

				<article class="article-body">
					{@html article.content}
				</article>
			</div>
		</main>
	{/if}
</div>

{:else if notFound}
<div class="not-found">
	<p>Article not found.</p>
	<a href="/">Go back</a>
</div>
{:else}
<div class="loading-reader">
	<div class="sk-block"></div>
	<div class="sk-block sk-block-sm"></div>
	<div class="sk-block"></div>
</div>
{/if}

<style>
	.reader-shell {
		height: 100%;
		background: var(--color-bg);
		color: var(--color-text);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		height: 2px;
		background: var(--color-accent);
		z-index: 200;
		transition: width 0.1s;
	}

	.reader-header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 1rem;
		height: var(--nav-height);
	}

	.back-btn,
	.header-btn {
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
		flex-shrink: 0;
	}

	.back-btn:hover,
	.header-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.header-btn.active {
		color: var(--color-accent);
	}

	.web-frame {
		display: block;
		width: 100%;
		flex: 1;
		border: none;
		min-height: 0;
	}

	.header-site {
		flex: 1;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
	}

	.controls-backdrop {
		position: fixed;
		inset: 0;
		z-index: 110;
	}

	.controls-panel {
		position: fixed;
		top: var(--nav-height);
		right: 0;
		z-index: 111;
		background: var(--color-surface-raised);
		border-left: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		width: 260px;
		box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.08);
	}

	.reader-main {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		min-height: 0;
		padding: 2rem 1rem 4rem;
	}

	.reader-content {
		max-width: 68ch;
		margin: 0 auto;
	}

	.article-meta {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.article-source {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-accent);
		font-weight: 500;
		text-decoration: none;
		display: block;
		margin-bottom: 0.5rem;
	}

	.article-source:hover {
		text-decoration: underline;
	}

	.article-title {
		font-size: clamp(1.375rem, 4vw, 1.875rem);
		font-weight: 700;
		line-height: 1.25;
		margin: 0 0 0.75rem;
		color: var(--color-text);
	}

	.article-byline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.article-byline span:not(:last-child)::after {
		content: '·';
		margin-left: 0.5rem;
	}

	/* Article body content styles */
	.article-body :global(h1),
	.article-body :global(h2),
	.article-body :global(h3),
	.article-body :global(h4) {
		line-height: 1.3;
		margin: 1.75em 0 0.5em;
		color: var(--color-text);
	}

	.article-body :global(p) {
		margin: 0 0 1em;
	}

	.article-body :global(a) {
		color: var(--color-accent);
	}

	.article-body :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
		margin: 1em 0;
	}

	.article-body :global(figure) {
		margin: 1.5em 0;
	}

	.article-body :global(figcaption) {
		font-size: 0.8125em;
		color: var(--color-text-muted);
		margin-top: 0.5em;
		text-align: center;
	}

	.article-body :global(blockquote) {
		border-left: 3px solid var(--color-accent);
		margin: 1.5em 0;
		padding: 0.5em 1em;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.article-body :global(code) {
		font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.875em;
		background: var(--color-surface-raised);
		padding: 0.15em 0.35em;
		border-radius: 3px;
	}

	.article-body :global(pre) {
		background: var(--color-surface-raised);
		padding: 1em;
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: 1em 0;
	}

	.article-body :global(pre code) {
		background: none;
		padding: 0;
		font-size: 0.875em;
	}

	.article-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1em 0;
		font-size: 0.9em;
	}

	.article-body :global(th),
	.article-body :global(td) {
		border: 1px solid var(--color-border);
		padding: 0.5em 0.75em;
		text-align: left;
	}

	.article-body :global(th) {
		background: var(--color-surface-raised);
		font-weight: 600;
	}

	.article-body :global(ul),
	.article-body :global(ol) {
		padding-left: 1.5em;
		margin: 0 0 1em;
	}

	.article-body :global(li) {
		margin-bottom: 0.25em;
	}

	.article-body :global(.readlist-sc),
	.article-body :global(abbr) {
		font-variant: small-caps;
	}

	.not-found {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		gap: 1rem;
		color: var(--color-text-muted);
	}

	.loading-reader {
		padding: 3rem 1rem;
		max-width: 68ch;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sk-block {
		height: 20px;
		background: var(--color-surface-raised);
		border-radius: var(--radius-sm);
		animation: shimmer 1.2s ease-in-out infinite;
	}

	.sk-block-sm {
		width: 50%;
	}

	@keyframes shimmer {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
