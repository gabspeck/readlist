<script lang="ts">
	import type { Article } from '$lib/types';
	import { copyToClipboard } from '$lib/services/share';

	let {
		article,
		selected = false,
		readingProgress = 0,
		showStatus = false,
		onSelect,
		onArchive,
		onDelete,
		onToggleRead
	}: {
		article: Article;
		selected?: boolean;
		readingProgress?: number;
		showStatus?: boolean;
		onSelect?: (id: string) => void;
		onArchive?: (id: string) => void;
		onDelete?: (id: string) => void;
		onToggleRead?: (id: string, isRead: boolean) => void;
	} = $props();

	function readingTime(wordCount: number): string {
		const mins = Math.ceil(wordCount / 238);
		return `${mins} min read`;
	}

	function formatDate(ts: number): string {
		const d = new Date(ts);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffDays = Math.floor(diffMs / 86400000);
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let showMenu = $state(false);
	let copied = $state(false);

	function toggleMenu(e: Event): void {
		e.preventDefault();
		e.stopPropagation();
		showMenu = !showMenu;
	}

	function closeMenu(): void {
		showMenu = false;
	}

	async function shareArticle(): Promise<void> {
		closeMenu();
		if (navigator.share) {
			await navigator.share({ title: article.title, url: article.url });
		} else {
			await copyToClipboard(article.url);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="card" class:unread={!article.isRead} class:selected>
	{#if onSelect}
		<label class="select-checkbox" aria-label="Select article">
			<input
				type="checkbox"
				checked={selected}
				onchange={() => onSelect?.(article.id)}
			/>
		</label>
	{/if}

	<a href="/read/{article.id}" class="card-body">
		<div class="card-meta">
			<span class="site-name">{article.siteName || new URL(article.url).hostname}</span>
			<span class="date">{formatDate(article.savedAt)}</span>
			{#if showStatus}
				{#if article.isRead}
					<span class="status-badge read" title="Read">Read</span>
				{:else}
					<span class="status-badge unread" title="Unread">Unread</span>
				{/if}
			{/if}
		</div>

		<h2 class="card-title" class:read={article.isRead}>{article.title}</h2>

		{#if article.excerpt}
			<p class="card-excerpt">{article.excerpt}</p>
		{/if}

		<div class="card-footer">
			{#if article.author}
				<span class="author">{article.author}</span>
			{/if}
			{#if article.wordCount}
				<span class="reading-time">{readingTime(article.wordCount)}</span>
			{/if}
			{#if article.tags.length > 0}
				<div class="tags">
					{#each article.tags as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
	</a>

	{#if readingProgress > 0}
		<div class="progress-bar" style="width: {readingProgress}%" aria-hidden="true"></div>
	{/if}

	<div class="card-actions">
		{#if copied}
			<span class="copied-label" aria-live="polite">Copied!</span>
		{/if}
		<button
			class="menu-trigger"
			aria-label="Article options"
			aria-expanded={showMenu}
			onclick={toggleMenu}
		>
			<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
				<circle cx="9" cy="4" r="1.5" fill="currentColor"/>
				<circle cx="9" cy="9" r="1.5" fill="currentColor"/>
				<circle cx="9" cy="14" r="1.5" fill="currentColor"/>
			</svg>
		</button>

		{#if showMenu}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="overlay" onclick={closeMenu} onkeydown={(e) => e.key === 'Escape' && closeMenu()}></div>
			<div class="menu" role="menu">
				<button role="menuitem" onclick={shareArticle}>
					Share
				</button>
				<button
					role="menuitem"
					onclick={() => { onToggleRead?.(article.id, !article.isRead); closeMenu(); }}
				>
					{article.isRead ? 'Mark unread' : 'Mark read'}
				</button>
				<button
					role="menuitem"
					onclick={() => { onArchive?.(article.id); closeMenu(); }}
				>
					{article.archived ? 'Unarchive' : 'Archive'}
				</button>
				<button
					role="menuitem"
					class="danger"
					onclick={() => { onDelete?.(article.id); closeMenu(); }}
				>
					Delete
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.card {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		position: relative;
		position: relative;
		background: var(--color-surface);
		transition: background 0.15s;
	}

	.card:hover {
		background: var(--color-surface-hover);
	}

	.card.selected {
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
	}

	.select-checkbox {
		padding-top: 0.25rem;
		flex-shrink: 0;
	}

	.select-checkbox input {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: var(--color-accent);
	}

	.card-body {
		flex: 1;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}

	.card-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.site-name {
		font-size: 0.75rem;
		color: var(--color-accent);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.status-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.1rem 0.375rem;
		border-radius: 999px;
		flex-shrink: 0;
		letter-spacing: 0.02em;
	}

	.status-badge.unread {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}

	.status-badge.read {
		background: var(--color-surface-raised);
		color: var(--color-text-muted);
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.35;
		margin: 0 0 0.35rem;
		color: var(--color-text);
	}

	.card-title.read {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.card-excerpt {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		margin: 0 0 0.5rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.author, .reading-time {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.author::after {
		content: '·';
		margin-left: 0.5rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tag {
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		color: var(--color-text-muted);
	}

	.card-actions {
		position: relative;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.copied-label {
		font-size: 0.75rem;
		color: var(--color-accent);
		font-weight: 500;
		white-space: nowrap;
	}

	.menu-trigger {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.375rem;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
	}

	.menu-trigger:hover {
		background: var(--color-surface-raised);
		color: var(--color-text);
	}

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.menu {
		position: absolute;
		right: 0;
		top: 100%;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		min-width: 160px;
		z-index: 11;
		overflow: hidden;
	}

	.menu button {
		display: block;
		width: 100%;
		padding: 0.625rem 1rem;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--color-text);
	}

	.menu button:hover {
		background: var(--color-surface-hover);
	}

	.menu button.danger {
		color: var(--color-danger);
	}

	.unread .card-title {
		font-weight: 600;
	}

	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		background: var(--color-accent);
		opacity: 0.6;
		pointer-events: none;
	}
</style>
