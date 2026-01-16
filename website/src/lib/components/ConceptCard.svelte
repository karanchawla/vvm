<script lang="ts">
	let {
		title,
		description,
		class: className = ''
	}: { title: string; description: string; class?: string } = $props();
</script>

<article
	class="p-5 sm:p-6 bg-surface-secondary dark:bg-surface-dark-secondary border border-edge dark:border-edge-dark rounded-lg transition-colors hover:border-brand/20 dark:hover:border-white/15 hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary {className}"
>
	<h3 class="font-display text-base sm:text-lg font-light text-brand dark:text-white mb-2 sm:mb-3 tracking-wide">
		{title}
	</h3>
	<p class="font-sans text-sm sm:text-base leading-relaxed text-ink-secondary dark:text-ink-dark-secondary m-0">
		{description}
	</p>
</article>
