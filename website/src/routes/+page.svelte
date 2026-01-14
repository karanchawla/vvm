<script lang="ts">
	import { onMount } from 'svelte';

	let mounted = $state(false);
	let cursorVisible = $state(true);

	onMount(() => {
		mounted = true;
		const interval = setInterval(() => {
			cursorVisible = !cursorVisible;
		}, 530);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>VVM - Vibe Virtual Machine</title>
	<meta name="description" content="VVM is a programming language for AI agents. Learn how language models become runtimes and why that changes everything." />
</svelte:head>

<!-- Hero Section -->
<div
	class="flex items-center justify-center text-center px-4 py-16 sm:py-20 md:py-24 transition-opacity duration-700 {mounted
		? 'opacity-100'
		: 'opacity-0'}"
>
	<div>
		<h1 class="title font-display text-2xl sm:text-3xl md:text-4xl tracking-wide mb-5 font-light leading-tight">
			Vibe Virtual Machine
		</h1>

		<p class="font-sans text-sm sm:text-base tracking-wide text-neutral-500 leading-relaxed">
			The protocol for intelligence
		</p>

		<p
			class="mt-12 font-mono text-xs tracking-wider uppercase text-neutral-400 flex items-center justify-center"
		>
			<span>Coming Soon</span>
			<span
				class="inline-block w-1.5 h-3 ml-1 bg-neutral-400 transition-opacity duration-100 {cursorVisible
					? 'opacity-100'
					: 'opacity-0'}"
				aria-hidden="true"
			></span>
		</p>
	</div>
</div>

<style>
	.title {
		color: oklch(0.476 0.296 265);
	}
</style>
