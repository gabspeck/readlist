<script lang="ts">
	import Toast from './Toast.svelte';

	interface ToastItem {
		id: string;
		message: string;
		action?: string;
		onAction?: () => void;
		timeout?: ReturnType<typeof setTimeout>;
	}

	let toasts = $state<ToastItem[]>([]);

	export function show(message: string, opts?: { action?: string; onAction?: () => void; duration?: number }): string {
		const id = crypto.randomUUID();
		const item: ToastItem = { id, message, action: opts?.action, onAction: opts?.onAction };

		const duration = opts?.duration ?? 4000;
		item.timeout = setTimeout(() => dismiss(id), duration);
		toasts = [...toasts, item];
		return id;
	}

	function dismiss(id: string): void {
		const item = toasts.find((t) => t.id === id);
		if (item?.timeout) clearTimeout(item.timeout);
		toasts = toasts.filter((t) => t.id !== id);
	}
</script>

<div class="toast-container" aria-live="polite" aria-atomic="false">
	{#each toasts as toast (toast.id)}
		<Toast
			message={toast.message}
			action={toast.action}
			onAction={toast.onAction}
			onDismiss={() => dismiss(toast.id)}
		/>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: calc(var(--nav-height-mobile) + 1rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		width: calc(100% - 2rem);
		max-width: 400px;
		pointer-events: none;
	}

	.toast-container :global(.toast) {
		pointer-events: all;
	}

	@media (min-width: 768px) {
		.toast-container {
			bottom: 1.5rem;
			left: auto;
			right: 1.5rem;
			transform: none;
		}
	}
</style>
