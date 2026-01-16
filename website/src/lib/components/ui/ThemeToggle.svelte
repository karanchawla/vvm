<script lang="ts">
	import { theme } from '$lib/stores/theme';

	let currentTheme = $derived($theme);
</script>

<button
	class="theme-toggle"
	onclick={() => theme.toggle()}
	aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if currentTheme === 'dark'}
		<!-- Sun icon for light mode -->
		<svg
			class="icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="5" />
			<line x1="12" y1="1" x2="12" y2="3" />
			<line x1="12" y1="21" x2="12" y2="23" />
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
			<line x1="1" y1="12" x2="3" y2="12" />
			<line x1="21" y1="12" x2="23" y2="12" />
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
		</svg>
	{:else}
		<!-- Moon icon for dark mode -->
		<svg
			class="icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{/if}
</button>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-primary);
		border-radius: 6px;
		cursor: pointer;
		color: var(--text-muted);
		transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
	}

	.theme-toggle:hover {
		color: var(--accent-color);
		border-color: var(--border-hover);
		background: var(--accent-soft);
	}

	.theme-toggle:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
		color: var(--accent-color);
	}

	.icon {
		width: 18px;
		height: 18px;
	}
</style>
