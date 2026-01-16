<script lang="ts">
	type FaqItem = {
		question: string;
		answer: string;
	};

	let { items }: { items: FaqItem[] } = $props();
	let openIndex = $state(-1);

	function toggle(index: number) {
		openIndex = openIndex === index ? -1 : index;
	}
</script>

<div class="border-t border-edge dark:border-edge-dark">
	{#each items as item, index}
		<div class="border-b border-edge dark:border-edge-dark">
			<button
				class="w-full min-h-11 flex items-center justify-between gap-4 py-3 bg-transparent border-none cursor-pointer text-left font-sans text-base font-medium text-ink dark:text-ink-dark transition-colors hover:text-brand dark:hover:text-white focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-2 focus-visible:rounded-sm"
				onclick={() => toggle(index)}
				aria-expanded={openIndex === index}
				aria-controls="faq-answer-{index}"
			>
				<span class="flex-1">{item.question}</span>
				<span class="shrink-0 text-ink-faint dark:text-ink-dark-faint transition-all duration-200 {openIndex === index ? 'rotate-180 text-brand dark:text-white' : ''}">
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</span>
			</button>
			<div
				id="faq-answer-{index}"
				class="grid transition-all duration-250 ease-out {openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}"
				aria-hidden={openIndex !== index}
			>
				<div class="overflow-hidden font-sans text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted {openIndex === index ? 'pb-5' : 'pb-0'}">
					{item.answer}
				</div>
			</div>
		</div>
	{/each}
</div>
