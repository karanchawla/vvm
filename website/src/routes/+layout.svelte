<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { theme } from '$lib/stores/theme';

	let { children } = $props();

	onMount(() => {
		theme.init();
	});
</script>

<div class="min-h-screen flex flex-col" style="background: var(--bg-primary);">
	<Header />
	<main class="flex-1 flex flex-col">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	:global(html, body) {
		height: 100%;
		background: var(--bg-primary);
	}
</style>
