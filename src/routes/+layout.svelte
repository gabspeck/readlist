<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { reader } from '$lib/stores/reader.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { sync } from '$lib/stores/sync.svelte';

	let { children } = $props();

	onMount(() => {
		settings.init();
		reader.init();
		theme.init();
		sync.init();
	});
</script>

<style>
	.app-frame {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		max-width: 860px;
		margin-inline: auto;
		overflow: hidden;
	}
</style>

<svelte:head>
	<title>Readlist</title>
	<meta name="description" content="A free, open-source read-later app. Your articles, your device, your data." />
	<meta name="theme-color" content="#4a6cf7" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="app-frame">
	{@render children()}
</div>
