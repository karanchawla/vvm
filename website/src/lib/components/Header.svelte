<header class="w-full px-4 sm:px-6 py-4">
	<nav class="max-w-4xl mx-auto flex items-center justify-between" aria-label="Main navigation">
		<a href="/" class="logo font-mono text-sm tracking-wider">VVM</a>
		<div class="flex gap-4">
			<a href="/about" class="nav-link font-mono text-xs tracking-wider text-neutral-500">About</a>
		</div>
	</nav>
</header>

<style>
	.logo {
		color: oklch(0.476 0.296 265);
		text-decoration: none;
		padding: 0.5rem;
		margin: -0.5rem;
		border-radius: 4px;
	}

	.logo:hover {
		text-decoration: none;
	}

	.logo:focus-visible {
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 2px;
	}

	.nav-link {
		text-decoration: none;
		transition: color 0.15s ease;
		padding: 0.5rem;
		margin: -0.5rem;
		border-radius: 4px;
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
