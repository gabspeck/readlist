<script lang="ts">
	let {
		message,
		action,
		onAction,
		onDismiss
	}: {
		message: string;
		action?: string;
		onAction?: () => void;
		onDismiss?: () => void;
	} = $props();
</script>

<div class="toast" role="status" aria-live="polite">
	<span class="toast-message">{message}</span>
	{#if action && onAction}
		<button class="toast-action" onclick={onAction}>{action}</button>
	{/if}
	<button class="toast-close" onclick={onDismiss} aria-label="Dismiss">
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
		</svg>
	</button>
</div>

<style>
	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface-raised);
		color: var(--color-text);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		border: 1px solid var(--color-border);
		max-width: 400px;
		width: 100%;
	}

	.toast-message {
		flex: 1;
		font-size: 0.875rem;
	}

	.toast-action {
		background: none;
		border: none;
		color: var(--color-accent);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
		white-space: nowrap;
	}

	.toast-action:hover {
		text-decoration: underline;
	}

	.toast-close {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.toast-close:hover {
		background: var(--color-surface-hover);
	}
</style>
