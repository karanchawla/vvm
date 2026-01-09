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
</svelte:head>

<main class="min-h-screen bg-white flex flex-col relative">
	<!-- Main content -->
	<div
		class="flex-1 flex items-center justify-center px-4 transition-opacity duration-700 {mounted
			? 'opacity-100'
			: 'opacity-0'}"
	>
		<div class="text-center">
			<h1 class="title font-mono text-lg sm:text-xl md:text-2xl tracking-wider mb-5">
				VIBE VIRTUAL MACHINE
			</h1>

			<p class="font-mono text-xs sm:text-sm tracking-wide text-neutral-500">
				a tiny language for orchestrating AI agents
			</p>

			<p class="mt-12 font-mono text-[10px] tracking-widest uppercase text-neutral-400 flex items-center justify-center">
				<span>Coming Soon</span><span
					class="inline-block w-1.5 h-[10px] ml-1 bg-neutral-400 {cursorVisible ? 'opacity-100' : 'opacity-0'}"
				></span>
			</p>
		</div>
	</div>

	<!-- Footer -->
	<div>
		<p class="text-center font-mono text-[10px] text-neutral-300 mb-3">
			&copy; 2026 Karan Chawla
		</p>
		<div class="dither-footer h-6 sm:h-8 w-full"></div>
	</div>
</main>

<style>
	:global(html, body) {
		height: 100%;
		background: white;
	}

	.title {
		color: oklch(0.476 0.296 265);
	}

	.dither-footer {
		background-image: url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h1v1H0V0zm2 0h1v1H2V0zm1 1h1v1H3V1zm-2 0h1v1H1V1zm0 2h1v1H1V3zm2 0h1v1H3V3zM0 2h1v1H0V2zm2 2h1v1H2V4z' fill='%23d4d4d4' fill-rule='evenodd'/%3E%3C/svg%3E");
		background-repeat: repeat;
		mask-image: linear-gradient(to bottom, transparent, black 50%);
		-webkit-mask-image: linear-gradient(to bottom, transparent, black 50%);
	}
</style>
