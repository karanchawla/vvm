<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 48, class: className = '' }: Props = $props();
</script>

<a href="/" class="logo-link {className}" aria-label="VVM Home">
	<svg
		width={size}
		height={size}
		viewBox="0 0 48 48"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<circle cx="24" cy="24" r="20" fill="oklch(0.476 0.296 265)" />
	</svg>
</a>

<style>
	.logo-link {
		display: inline-flex;
		width: fit-content;
		text-decoration: none;
		border-radius: 50%;
		transition: opacity 0.2s ease;
	}

	.logo-link:hover {
		opacity: 0.75;
		text-decoration: none;
	}

	.logo-link:focus-visible {
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 4px;
	}
</style>
