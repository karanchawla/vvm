<script lang="ts">
	import CodeBlock from './CodeBlock.svelte';

	interface Example {
		title: string;
		description: string;
		code: string;
	}

	let { examples, class: className = '' }: { examples: Example[]; class?: string } = $props();

	let activeIndex = $state(0);

	function selectExample(index: number) {
		activeIndex = index;
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectExample(index);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			selectExample((activeIndex + 1) % examples.length);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			selectExample((activeIndex - 1 + examples.length) % examples.length);
		}
	}
</script>

<div class="w-full {className}">
	<!-- Tab navigation -->
	<div class="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Code examples">
		{#each examples as example, i}
			<button
				role="tab"
				aria-selected={activeIndex === i}
				aria-controls="example-panel-{i}"
				id="example-tab-{i}"
				tabindex={activeIndex === i ? 0 : -1}
				class="shrink-0 py-2.5 px-4 font-sans text-sm bg-transparent border rounded-md cursor-pointer transition-all whitespace-nowrap min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 {activeIndex === i
					? 'text-brand dark:text-white border-brand/30 dark:border-white/25 bg-brand/10 dark:bg-white/10'
					: 'text-ink-muted dark:text-ink-dark-muted border-edge dark:border-edge-dark hover:text-ink-secondary dark:hover:text-ink-dark-secondary hover:border-edge-hover dark:hover:border-edge-dark-hover'} focus-visible:outline-brand/50 dark:focus-visible:outline-white/40"
				onclick={() => selectExample(i)}
				onkeydown={(e) => handleKeydown(e, i)}
			>
				{example.title}
			</button>
		{/each}
	</div>

	<!-- Active example content -->
	{#each examples as example, i}
		<div
			role="tabpanel"
			id="example-panel-{i}"
			aria-labelledby="example-tab-{i}"
			class={activeIndex === i ? 'block' : 'hidden'}
			hidden={activeIndex !== i}
		>
			<p class="font-sans text-sm sm:text-base leading-normal sm:leading-relaxed text-ink-muted dark:text-ink-dark-muted mb-3 sm:mb-4">
				{example.description}
			</p>
			<CodeBlock code={example.code} />
		</div>
	{/each}
</div>

<style>
	.scrollbar-none {
		scrollbar-width: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
