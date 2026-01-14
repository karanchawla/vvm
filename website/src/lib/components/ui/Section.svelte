<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		id?: string;
	}

	let { children, class: className = '', id }: Props = $props();
</script>

<section class="py-1 sm:py-2 md:py-3 {className}" {id}>
	{@render children()}
</section>
