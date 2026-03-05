<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initSettings } from '$lib/stores/settings';
	import { initReaderSettings } from '$lib/stores/reader';
	import { initAppTheme } from '$lib/stores/theme';
	import { initSync } from '$lib/stores/sync';

	let { children } = $props();

	onMount(() => {
		initSettings();
		initReaderSettings();
		initAppTheme();
		initSync();
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
