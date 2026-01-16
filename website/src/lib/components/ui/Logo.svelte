<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 48, class: className = '' }: Props = $props();
</script>

<a
	href="/"
	class="inline-flex w-fit no-underline transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-4 focus-visible:rounded {className}"
	aria-label="VVM Home"
>
	<img
		src="/logo.svg"
		alt=""
		width={size}
		height={size}
		class="block dark:hidden"
		aria-hidden="true"
	/>
	<img
		src="/logo-white.svg"
		alt=""
		width={size}
		height={size}
		class="hidden dark:block"
		aria-hidden="true"
	/>
</a>
