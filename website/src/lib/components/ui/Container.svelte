<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		id?: string;
	}

	let { children, class: className = '', id }: Props = $props();
</script>

<div class="mx-auto max-w-5xl px-4 py-1 sm:px-6 sm:py-2 md:px-8 md:py-2 {className}" {id}>
	{@render children()}
</div>
