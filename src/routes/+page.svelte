<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import AddArticleDialog from '$lib/components/AddArticleDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import KindleHelp from '$lib/components/KindleHelp.svelte';
	import {
		articles,
		filteredArticles,
		isLoading,
		loadArticles,
		addArticle,
		markRead,
		archiveArticle,
		unarchiveArticle,
		removeArticle,
		sortMode
	} from '$lib/stores/articles';
	import { exportArticlesAsEpub } from '$lib/services/epub';

	let showAddDialog = $state(false);
	let showKindleHelp = $state(false);
	let selectedIds = $state(new Set<string>());
	let exporting = $state(false);
	let progressMap = $state<Record<string, number>>({});
	let toastContainer: ReturnType<typeof ToastContainer> | undefined;

	function loadProgressMap(): void {
		const map: Record<string, number> = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('readprogress:')) {
				const val = localStorage.getItem(key);
				if (val) map[key.slice('readprogress:'.length)] = parseInt(val);
			}
		}
		progressMap = map;
	}

	onMount(() => {
		loadArticles();
		loadProgressMap();
	});

	async function handleDelete(id: string): Promise<void> {
		const article = await removeArticle(id);
		toastContainer?.show('Article deleted', {
			action: 'Undo',
			onAction: async () => {
				if (article) await addArticle(article);
			}
		});
	}

	async function handleArchive(id: string): Promise<void> {
		const a = $filteredArticles.find((x) => x.id === id);
		if (!a) return;
		if (a.archived) {
			await unarchiveArticle(id);
			toastContainer?.show('Restored from archive');
		} else {
			await archiveArticle(id);
			toastContainer?.show('Moved to archive', {
				action: 'Undo',
				onAction: () => unarchiveArticle(id)
			});
		}
	}

	function toggleSelect(id: string): void {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function toggleSelectAll(): void {
		const visibleIds = $filteredArticles.map((a) => a.id);
		const allSelected = visibleIds.every((id) => selectedIds.has(id));
		selectedIds = allSelected ? new Set() : new Set(visibleIds);
	}

	function clearSelection(): void {
		selectedIds = new Set();
	}

	async function exportAsEpub(): Promise<void> {
		const toExport = $articles.filter((a) => selectedIds.has(a.id));
		if (!toExport.length) return;

		exporting = true;
		try {
			await exportArticlesAsEpub(toExport);
			await Promise.all(toExport.map((a) => markRead(a.id, true)));
			const n = toExport.length;
			toastContainer?.show(`Exported ${n} article${n !== 1 ? 's' : ''} and marked as read`, {
				action: 'Undo',
				onAction: () => Promise.all(toExport.map((a) => markRead(a.id, false)))
			});
			clearSelection();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Export failed';
			toastContainer?.show(msg);
		} finally {
			exporting = false;
		}
	}

	let visibleCount = $derived($filteredArticles.length);
	let selectedCount = $derived(selectedIds.size);
	let allVisibleSelected = $derived(
		visibleCount > 0 && $filteredArticles.every((a) => selectedIds.has(a.id))
	);
	let someSelected = $derived(selectedCount > 0);
</script>

<div class="app-shell">
	<Navigation onAdd={() => { showAddDialog = true; }} />

	<main class="main">
		{#if $isLoading}
			<div class="loading-list">
				{#each Array(5) as _}
					<div class="skeleton-card">
						<div class="sk sk-site"></div>
						<div class="sk sk-title"></div>
						<div class="sk sk-excerpt"></div>
					</div>
				{/each}
			</div>
		{:else if visibleCount === 0}
			<EmptyState onAdd={() => { showAddDialog = true; }} />
		{:else}
			<div class="list-header" role="toolbar" aria-label="Selection controls">
				<label class="select-all-label">
					<input
						type="checkbox"
						class="select-all-checkbox"
						checked={allVisibleSelected}
						indeterminate={someSelected && !allVisibleSelected}
						onchange={toggleSelectAll}
						aria-label={allVisibleSelected ? 'Deselect all' : 'Select all'}
					/>
					<span class="list-count">
						{#if someSelected}
							{selectedCount} of {visibleCount} selected
						{:else}
							{visibleCount} article{visibleCount !== 1 ? 's' : ''}
						{/if}
					</span>
				</label>

				{#if !someSelected}
					<select
						class="sort-select"
						value={$sortMode}
						onchange={(e) => sortMode.set(e.currentTarget.value as typeof $sortMode)}
						aria-label="Sort articles"
					>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
						<option value="title">Title A–Z</option>
						<option value="length">Shortest</option>
						<option value="progress">In progress</option>
						<option value="lastopened">Last opened</option>
					</select>
				{/if}

				{#if someSelected}
					<div class="sel-actions">
						<button
							class="sel-btn sel-export"
							onclick={exportAsEpub}
							disabled={exporting}
							title="Export as EPUB for Kindle or any e-reader"
						>
							{#if exporting}
								<span class="spinner" aria-hidden="true"></span>
								Exporting…
							{:else}
								<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
									<path d="M7.5 1v9M4 7l3.5 3L11 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M2 12h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
								</svg>
								Export EPUB
							{/if}
						</button>

						<button
							class="sel-btn sel-kindle-help"
							onclick={() => { showKindleHelp = true; }}
							title="How to send to Kindle"
							aria-label="How to send to Kindle"
						>
							<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
								<circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.3"/>
								<path d="M7.5 10.5V7M7.5 4.5v.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
							</svg>
							Kindle
						</button>

						<button class="sel-btn sel-clear" onclick={clearSelection}>Clear</button>
					</div>
				{/if}
			</div>

			<ul class="article-list" aria-label="Articles">
				{#each $filteredArticles as article (article.id)}
					<li>
						<ArticleCard
							{article}
							selected={selectedIds.has(article.id)}
							readingProgress={progressMap[article.id] ?? 0}
							onSelect={toggleSelect}
							onArchive={handleArchive}
							onDelete={handleDelete}
							onToggleRead={(id, isRead) => markRead(id, isRead)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
</div>

{#if showAddDialog}
	<AddArticleDialog
		onSave={addArticle}
		onClose={() => { showAddDialog = false; }}
	/>
{/if}

{#if showKindleHelp}
	<KindleHelp onClose={() => { showKindleHelp = false; }} />
{/if}

<ToastContainer bind:this={toastContainer} />

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.main {
		flex: 1;
		max-width: 720px;
		width: 100%;
		margin: 0 auto;
	}

	.article-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/* List header */
	.list-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--color-border);
		min-height: 40px;
	}

	.select-all-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		flex: 1;
		min-width: 0;
	}

	.select-all-checkbox {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		cursor: pointer;
		accent-color: var(--color-accent);
	}

	.sort-select {
		background: none;
		border: none;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.2rem 0.1rem;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
		font-family: inherit;
	}

	.sort-select:hover {
		color: var(--color-text);
	}

	.sort-select:focus {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.list-count {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Selection actions */
	.sel-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.sel-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-accent);
		padding: 0.3rem 0.5rem;
		border-radius: var(--radius-sm);
		min-height: 32px;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		white-space: nowrap;
	}

	.sel-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.sel-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.sel-export {
		background: var(--color-accent);
		color: #fff;
		border-radius: var(--radius-md);
		padding: 0.3rem 0.625rem;
	}

	.sel-export:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}

	.sel-kindle-help {
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.3rem 0.5rem;
	}

	.sel-kindle-help:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.sel-clear {
		color: var(--color-text-muted);
	}

	.spinner {
		width: 13px;
		height: 13px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Skeletons */
	.loading-list { padding: 0; }

	.skeleton-card {
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sk {
		background: var(--color-surface-raised);
		border-radius: var(--radius-sm);
		animation: shimmer 1.2s ease-in-out infinite;
	}

	.sk-site { height: 10px; width: 80px; }
	.sk-title { height: 18px; width: 75%; }
	.sk-excerpt { height: 12px; width: 55%; }

	@keyframes shimmer {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
