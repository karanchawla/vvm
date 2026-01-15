<script lang="ts">
	import Logo from './ui/Logo.svelte';
</script>

<header class="sticky top-2 sm:top-3 md:top-4 z-50 px-2 sm:px-4 md:px-6">
	<nav
		class="mx-auto flex max-w-5xl items-center justify-between rounded-lg border border-neutral-200 bg-white/80 px-2 py-2.5 backdrop-blur-md shadow-sm"
		aria-label="Main navigation"
	>
		<Logo size={28} class="ml-0" />
		<div class="flex items-center">
			<a href="/about" class="nav-link font-mono text-xs tracking-wider text-neutral-500">About</a>
		</div>
	</nav>
</header>

<style>
	.nav-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		transition: color 0.15s ease;
		padding: 0.75rem 1rem;
		margin: -0.75rem -1rem;
		border-radius: 6px;
		min-height: 44px;
	}

	.nav-link:hover {
		color: oklch(0.476 0.296 265);
		text-decoration: none;
	}

	.nav-link:focus-visible {
		color: oklch(0.476 0.296 265);
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 2px;
	}
</style>
