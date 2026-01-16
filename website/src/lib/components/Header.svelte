<script lang="ts">
	import Logo from './ui/Logo.svelte';
	import ThemeToggle from './ui/ThemeToggle.svelte';
</script>

<header class="sticky top-2 sm:top-3 md:top-4 z-50 px-2 sm:px-4 md:px-6">
	<nav
		class="mx-auto flex max-w-5xl items-center justify-between rounded-lg px-2 py-2.5 backdrop-blur-md bg-white/80 dark:bg-surface-dark/85 border border-edge dark:border-edge-dark shadow-sm"
		aria-label="Main navigation"
	>
		<Logo size={28} class="ml-0" />
		<div class="flex items-center gap-2">
			<a
				href="/about"
				class="nav-link inline-flex items-center justify-center no-underline transition-colors py-3 px-4 -my-3 rounded-md min-h-11 font-mono text-xs tracking-wider text-ink-muted dark:text-ink-dark-muted hover:text-brand dark:hover:text-white focus-visible:text-brand dark:focus-visible:text-white focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-2"
			>
				About
			</a>
			<ThemeToggle />
		</div>
	</nav>
</header>
