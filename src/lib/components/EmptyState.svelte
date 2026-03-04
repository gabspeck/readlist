<script lang="ts">
	let { onAdd }: { onAdd: () => void } = $props();
</script>

<div class="empty">
	<div class="empty-icon" aria-hidden="true">
		<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
			<rect x="8" y="14" width="48" height="36" rx="4" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
			<path d="M24 26h16M24 32h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
		</svg>
	</div>
	<h2 class="empty-title">Your reading list is empty</h2>
	<p class="empty-desc">Save articles to read them later, offline, without distractions.</p>
	<button class="empty-action" onclick={onAdd}>
		Save your first article
	</button>
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 4rem 1.5rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.empty-icon {
		margin-bottom: 0.5rem;
		opacity: 0.4;
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.empty-desc {
		font-size: 0.9375rem;
		margin: 0;
		max-width: 30ch;
	}

	.empty-action {
		margin-top: 0.5rem;
		padding: 0.625rem 1.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.empty-action:hover {
		background: var(--color-accent-hover);
	}
</style>
