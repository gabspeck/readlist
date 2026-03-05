<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { appTheme, cycleTheme } from '$lib/stores/theme';
	import { searchQuery } from '$lib/stores/articles';
	import type { FilterMode } from '$lib/types';

	let { onAdd, hasArticles = false }: { onAdd: () => void; hasArticles?: boolean } = $props();

	const filters: { mode: FilterMode; label: string }[] = [
		{ mode: 'all', label: 'All' },
		{ mode: 'unread', label: 'Unread' },
		{ mode: 'inprogress', label: 'In Progress' },
		{ mode: 'read', label: 'Read' },
		{ mode: 'archived', label: 'Archived' }
	];

	let isHome = $derived($page.url.pathname === '/');
	let activeFilter = $derived(
		($page.url.searchParams.get('filter') ?? 'all') as FilterMode
	);
	let searchOpen = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();

	function setFilter(mode: FilterMode): void {
		const url = mode === 'all' ? '/' : `/?filter=${mode}`;
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function openSearch(): void {
		searchOpen = true;
		// Focus after DOM update
		setTimeout(() => searchInput?.focus(), 0);
	}

	function closeSearch(): void {
		searchOpen = false;
		searchQuery.set('');
	}

	function handleSearchKey(e: KeyboardEvent): void {
		if (e.key === 'Escape') closeSearch();
	}
</script>

<nav class="nav" aria-label="Main navigation">
	<div class="nav-top">
		{#if searchOpen}
			<div class="search-bar">
				<svg class="search-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/>
					<path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
				</svg>
				<input
					bind:this={searchInput}
					class="search-input"
					type="search"
					placeholder="Search articles…"
					value={$searchQuery}
					oninput={(e) => searchQuery.set(e.currentTarget.value)}
					onkeydown={handleSearchKey}
					aria-label="Search articles"
				/>
				<button class="icon-btn search-close" onclick={closeSearch} aria-label="Close search">
					<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
					</svg>
				</button>
			</div>
		{:else}
			<a href="/" class="brand-link">Readlist</a>

			<div class="nav-actions">
				{#if isHome}
					<button class="icon-btn" onclick={openSearch} aria-label="Search" disabled={!hasArticles}>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/>
							<path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
						</svg>
					</button>
					<button class="icon-btn accent" onclick={onAdd} aria-label="Save article">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</button>
				{/if}

				<button
					class="icon-btn"
					onclick={() => appTheme.update(cycleTheme)}
					aria-label="Toggle theme (current: {$appTheme})"
					title="Theme: {$appTheme}"
				>
					{#if $appTheme === 'dark'}
						<!-- Moon -->
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<path d="M17 12.5A7 7 0 0 1 8 3.7a7 7 0 1 0 9 8.8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
						</svg>
					{:else if $appTheme === 'light'}
						<!-- Sun -->
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/>
							<path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					{:else}
						<!-- Auto / half-circle -->
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<path d="M10 3a7 7 0 1 1 0 14V3z" fill="currentColor" opacity="0.35"/>
							<circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
						</svg>
					{/if}
				</button>

				<a href="/settings" class="icon-btn" aria-label="Settings" aria-current={$page.url.pathname === '/settings' ? 'page' : undefined}>
					<!-- Gear / cog -->
					<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
					</svg>
				</a>
			</div>
		{/if}
	</div>

	{#if isHome && !searchOpen}
		<div class="nav-tabs" role="tablist" aria-label="Filter articles">
			{#each filters as f}
				<button
					role="tab"
					aria-selected={activeFilter === f.mode}
					class="tab"
					class:active={activeFilter === f.mode}
					onclick={() => setFilter(f.mode)}
				>
					{f.label}
				</button>
			{/each}
		</div>
	{/if}
</nav>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.nav-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.75rem;
		height: 48px;
	}

	.brand-link {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
		letter-spacing: -0.02em;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		text-decoration: none;
		flex-shrink: 0;
	}

	.icon-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.icon-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.icon-btn.accent {
		background: var(--color-accent);
		color: #fff;
	}

	.icon-btn.accent:hover {
		background: var(--color-accent-hover);
	}

	.icon-btn[aria-current="page"] {
		color: var(--color-accent);
	}

	/* Search bar */
	.search-bar {
		display: flex;
		align-items: center;
		flex: 1;
		gap: 0.25rem;
		padding: 0 0.25rem 0 0.75rem;
	}

	.search-icon {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 1rem;
		color: var(--color-text);
		font-family: inherit;
		min-width: 0;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.search-input::-webkit-search-cancel-button {
		display: none;
	}

	.search-close {
		flex-shrink: 0;
	}

	/* Tab strip */
	.nav-tabs {
		display: flex;
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.5rem 0.25rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		min-height: 36px;
		letter-spacing: 0.01em;
		transition: color 0.1s, border-color 0.1s;
	}

	.tab:hover {
		color: var(--color-text);
	}

	.tab.active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
</style>
