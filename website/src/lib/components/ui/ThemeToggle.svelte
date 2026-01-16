<script lang="ts">
	import { theme } from '$lib/stores/theme';

	let currentTheme = $derived($theme);
</script>

<button
	class="inline-flex items-center justify-center size-9 p-0 bg-transparent border border-edge dark:border-edge-dark rounded-md cursor-pointer text-ink-muted dark:text-ink-dark-muted transition-colors hover:text-brand dark:hover:text-white hover:border-edge-hover dark:hover:border-edge-dark-hover hover:bg-brand/10 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-2 focus-visible:text-brand dark:focus-visible:text-white"
	onclick={() => theme.toggle()}
	aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if currentTheme === 'dark'}
		<!-- Sun icon for light mode -->
		<svg
			class="size-4.5"
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
			class="size-4.5"
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
