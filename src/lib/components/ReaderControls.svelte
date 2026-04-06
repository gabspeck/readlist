<script lang="ts">
	import { reader } from '$lib/stores/reader.svelte';

	let { onClose }: { onClose: () => void } = $props();

	const themes = [
		{ value: 'system', label: 'Auto' },
		{ value: 'light', label: 'Light' },
		{ value: 'sepia', label: 'Sepia' },
		{ value: 'dark', label: 'Dark' }
	] as const;

	const fonts = [
		{ value: 'serif', label: 'Serif' },
		{ value: 'sans', label: 'Sans' }
	] as const;
</script>

<div class="controls-panel" role="dialog" aria-label="Reader settings">
	<div class="controls-header">
		<span class="controls-title">Reader settings</span>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
				<path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
	</div>

	<div class="control-group">
		<span class="group-label">Theme</span>
		<div class="theme-buttons">
			{#each themes as t}
				<button
					class="theme-btn theme-{t.value}"
					class:active={reader.settings.theme === t.value}
					onclick={() => reader.settings =({ ...reader.settings, theme: t.value })}
					aria-pressed={reader.settings.theme === t.value}
				>
					{t.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="control-group">
		<span class="group-label">Font</span>
		<div class="segment">
			{#each fonts as f}
				<button
					class="segment-btn"
					class:active={reader.settings.fontFamily === f.value}
					onclick={() => reader.settings =({ ...reader.settings, fontFamily: f.value })}
					aria-pressed={reader.settings.fontFamily === f.value}
					style="font-family: {f.value === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'}"
				>
					{f.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="control-group">
		<span class="group-label">Text size</span>
		<div class="size-control">
			<button
				class="size-btn"
				aria-label="Decrease font size"
				onclick={() => reader.settings =({ ...reader.settings, fontSize: Math.max(14, reader.settings.fontSize - 1) })}
				disabled={reader.settings.fontSize <= 14}
			>A-</button>
			<span class="size-value">{reader.settings.fontSize}px</span>
			<button
				class="size-btn"
				aria-label="Increase font size"
				onclick={() => reader.settings =({ ...reader.settings, fontSize: Math.min(28, reader.settings.fontSize + 1) })}
				disabled={reader.settings.fontSize >= 28}
			>A+</button>
		</div>
	</div>

	<div class="control-group">
		<span class="group-label">Line spacing</span>
		<div class="size-control">
			<button
				class="size-btn"
				aria-label="Decrease line spacing"
				onclick={() => reader.settings =({ ...reader.settings, lineHeight: Math.max(1.2, +(reader.settings.lineHeight - 0.1).toFixed(1)) })}
				disabled={reader.settings.lineHeight <= 1.2}
			>−</button>
			<span class="size-value">{reader.settings.lineHeight.toFixed(1)}</span>
			<button
				class="size-btn"
				aria-label="Increase line spacing"
				onclick={() => reader.settings =({ ...reader.settings, lineHeight: Math.min(2.4, +(reader.settings.lineHeight + 0.1).toFixed(1)) })}
				disabled={reader.settings.lineHeight >= 2.4}
			>+</button>
		</div>
	</div>
</div>

<style>
	.controls-panel {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.controls-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.controls-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
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

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.theme-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.theme-btn {
		flex: 1;
		padding: 0.5rem;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.theme-btn.active {
		border-color: var(--color-accent);
	}

	.theme-system {
		background: linear-gradient(135deg, #fafafa 50%, #1a1a1a 50%);
		color: #111;
	}

	.theme-light {
		background: #fafafa;
		color: #111;
	}

	.theme-sepia {
		background: #f5edd6;
		color: #4a3d2a;
	}

	.theme-dark {
		background: #1a1a1a;
		color: #e0e0e0;
	}

	.segment {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.segment-btn {
		flex: 1;
		padding: 0.5rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.9375rem;
		color: var(--color-text-muted);
		min-height: 44px;
	}

	.segment-btn:first-child {
		border-right: 1px solid var(--color-border);
	}

	.segment-btn.active {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
		font-weight: 500;
	}

	.size-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.size-btn {
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.size-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.size-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.size-value {
		flex: 1;
		text-align: center;
		font-size: 0.9375rem;
		color: var(--color-text);
	}
</style>
