<script lang="ts">
	import { theme } from '$lib/stores/theme';

	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 48, class: className = '' }: Props = $props();

	// Use white logo in dark mode for better visibility
	let logoSrc = $derived($theme === 'dark' ? '/logo-white.svg' : '/logo.svg');
</script>

<a
	href="/"
	class="inline-flex w-fit no-underline transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-4 focus-visible:rounded {className}"
	aria-label="VVM Home"
>
	<img
		src={logoSrc}
		alt=""
		width={size}
		height={size}
		class="block"
		aria-hidden="true"
	/>
</a>
