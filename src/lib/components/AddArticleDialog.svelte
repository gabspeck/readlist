<script lang="ts">
	import { parseArticle } from '$lib/services/parser';
	import type { Article } from '$lib/types';

	let {
		onSave,
		onClose
	}: {
		onSave: (article: Article) => Promise<void>;
		onClose: () => void;
	} = $props();

	let url = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event): Promise<void> {
		e.preventDefault();
		error = '';

		let normalized = url.trim();
		if (!normalized) return;
		if (!/^https?:\/\//i.test(normalized)) {
			normalized = 'https://' + normalized;
		}

		loading = true;
		try {
			const parsed = await parseArticle(normalized);
			const article: Article = {
				...parsed,
				id: crypto.randomUUID(),
				savedAt: Date.now(),
				updatedAt: Date.now(),
				isRead: false,
				tags: [],
				archived: false
			};
			await onSave(article);
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save article';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') onClose();
	}

	let inputEl: HTMLInputElement | undefined;

	$effect(() => {
		inputEl?.focus();
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose} onkeydown={handleKeydown}></div>

<dialog open class="dialog" aria-labelledby="dialog-title">
	<div class="dialog-header">
		<h2 id="dialog-title">Save Article</h2>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
	</div>

	<form onsubmit={handleSubmit}>
		<label for="url-input" class="label">Article URL</label>
		<input
			id="url-input"
			bind:this={inputEl}
			type="url"
			bind:value={url}
			placeholder="https://example.com/article"
			class="input"
			class:input-error={!!error}
			autocomplete="off"
			spellcheck={false}
			disabled={loading}
		/>

		{#if error}
			<p class="error-msg" role="alert">{error}</p>
		{/if}

		<div class="dialog-actions">
			<button type="button" class="btn btn-ghost" onclick={onClose} disabled={loading}>
				Cancel
			</button>
			<button type="submit" class="btn btn-primary" disabled={loading || !url.trim()}>
				{#if loading}
					<span class="spinner" aria-hidden="true"></span>
					Saving…
				{:else}
					Save
				{/if}
			</button>
		</div>
	</form>
</dialog>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 100;
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 101;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		width: calc(100% - 2rem);
		max-width: 480px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
		margin: 0;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.dialog-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		display: flex;
	}

	.close-btn:hover {
		color: var(--color-text);
	}

	.label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.375rem;
		color: var(--color-text);
	}

	.input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.9375rem;
		outline: none;
		box-sizing: border-box;
	}

	.input:focus {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
	}

	.input-error {
		border-color: var(--color-danger);
	}

	.error-msg {
		font-size: 0.8125rem;
		color: var(--color-danger);
		margin: 0.375rem 0 0;
	}

	.dialog-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1.25rem;
	}

	.btn {
		padding: 0.5rem 1.25rem;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		min-width: 80px;
		justify-content: center;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-ghost {
		background: none;
		color: var(--color-text);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.btn-primary {
		background: var(--color-accent);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
