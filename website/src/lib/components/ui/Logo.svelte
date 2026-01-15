<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 48, class: className = '' }: Props = $props();
</script>

<a href="/" class="logo-link {className}" aria-label="VVM Home">
	<img
		src="/logo.svg"
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
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 4px;
		border-radius: 4px;
	}

	img {
		display: block;
	}
</style>
