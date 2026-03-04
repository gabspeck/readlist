<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}></div>

<dialog open class="dialog" aria-labelledby="kindle-help-title">
	<div class="dialog-header">
		<h2 id="kindle-help-title">Send to Kindle</h2>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
	</div>

	<div class="dialog-body">
		<p class="intro">
			After exporting, you can send the <code>.epub</code> file to your Kindle using any of these methods:
		</p>

		<ol class="steps">
			<li class="step">
				<div class="step-icon" aria-hidden="true">
					<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
						<rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
						<path d="M7 7h8M7 11h8M7 15h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</div>
				<div>
					<strong>Kindle app (iOS &amp; Android)</strong>
					<p>Tap <em>Share</em> on the EPUB file → choose <em>Copy to Kindle</em>. The book appears in your library instantly.</p>
				</div>
			</li>

			<li class="step">
				<div class="step-icon" aria-hidden="true">
					<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
						<rect x="2" y="5" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
						<path d="M2 9l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</div>
				<div>
					<strong>Send-to-Kindle email</strong>
					<p>
						Email the EPUB as an attachment to your Kindle address
						(<code>yourname@kindle.com</code>). Find it in
						<a href="https://www.amazon.com/mn/dcw/myx.html" target="_blank" rel="noopener noreferrer">Manage Your Content &amp; Devices</a>.
					</p>
				</div>
			</li>

			<li class="step">
				<div class="step-icon" aria-hidden="true">
					<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
						<path d="M11 3v12M7 11l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M4 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</div>
				<div>
					<strong>Send to Kindle desktop app</strong>
					<p>Drag the EPUB into the <em>Send to Kindle</em> app on macOS or Windows, or right-click the file and choose <em>Send to Kindle</em>.</p>
				</div>
			</li>
		</ol>

		<p class="note">
			Kindle has supported EPUB natively since 2022. No conversion needed.
		</p>
	</div>

	<div class="dialog-footer">
		<button class="btn-primary" onclick={onClose}>Got it</button>
	</div>
</dialog>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
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
		padding: 0;
		width: calc(100% - 2rem);
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
		margin: 0;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.dialog-header h2 {
		font-size: 1rem;
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

	.dialog-body {
		padding: 1.25rem 1.5rem;
	}

	.intro {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		margin: 0 0 1.25rem;
		line-height: 1.5;
	}

	.steps {
		list-style: none;
		margin: 0 0 1.25rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.125rem;
	}

	.step {
		display: flex;
		gap: 0.875rem;
		align-items: flex-start;
	}

	.step-icon {
		flex-shrink: 0;
		color: var(--color-accent);
		margin-top: 0.1rem;
	}

	.step strong {
		display: block;
		font-size: 0.9rem;
		margin-bottom: 0.25rem;
		color: var(--color-text);
	}

	.step p {
		font-size: 0.8375rem;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.step a {
		color: var(--color-accent);
	}

	code {
		font-family: ui-monospace, monospace;
		font-size: 0.8em;
		background: var(--color-surface-hover);
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	.note {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin: 0;
		padding: 0.75rem 1rem;
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
		border-radius: var(--radius-md);
		border: 1px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
	}

	.dialog-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: flex-end;
	}

	.btn-primary {
		padding: 0.5rem 1.5rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 40px;
	}

	.btn-primary:hover {
		background: var(--color-accent-hover);
	}
</style>
