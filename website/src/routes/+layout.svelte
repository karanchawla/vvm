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

<div class="min-h-screen flex flex-col bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-dark-secondary">
	<Header />
	<main class="flex-1 flex flex-col">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	@reference "../app.css";

	:global(html, body) {
		height: 100%;
	}
	:global(body) {
		@apply bg-surface dark:bg-surface-dark;
	}
</style>
