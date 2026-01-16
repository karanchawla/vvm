<script lang="ts">
	import Logo from './ui/Logo.svelte';
	import ThemeToggle from './ui/ThemeToggle.svelte';
</script>

<header class="sticky top-2 sm:top-3 md:top-4 z-50 px-2 sm:px-4 md:px-6">
	<nav
		class="nav-container mx-auto flex max-w-5xl items-center justify-between rounded-lg px-2 py-2.5 backdrop-blur-md"
		aria-label="Main navigation"
	>
		<Logo size={28} class="ml-0" />
		<div class="flex items-center gap-2">
			<a href="/about" class="nav-link font-mono text-xs tracking-wider">About</a>
			<ThemeToggle />
		</div>
	</nav>
</header>

<style>
	.nav-container {
		background: var(--header-bg);
		border: 1px solid var(--border-primary);
		box-shadow: var(--shadow-subtle);
	}

	.nav-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		transition: color 0.15s ease;
		padding: 0.75rem 1rem;
		margin: -0.75rem 0;
		border-radius: 6px;
		min-height: 44px;
		color: var(--text-muted);
	}

	.nav-link:hover {
		color: var(--accent-color);
		text-decoration: none;
	}

	.nav-link:focus-visible {
		color: var(--accent-color);
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}
</style>
