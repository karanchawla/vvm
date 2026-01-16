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

<a href="/" class="logo-link {className}" aria-label="VVM Home">
	<img
		src={logoSrc}
		alt=""
		width={size}
		height={size}
		aria-hidden="true"
	/>
</a>

<style>
	.logo-link {
		display: inline-flex;
		width: fit-content;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.logo-link:hover {
		opacity: 0.8;
		text-decoration: none;
	}

	.logo-link:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 4px;
		border-radius: 4px;
	}

	img {
		display: block;
	}
</style>
