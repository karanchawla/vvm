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

<div class="example-carousel {className}">
	<!-- Tab navigation -->
	<div class="tabs" role="tablist" aria-label="Code examples">
		{#each examples as example, i}
			<button
				role="tab"
				aria-selected={activeIndex === i}
				aria-controls="example-panel-{i}"
				id="example-tab-{i}"
				tabindex={activeIndex === i ? 0 : -1}
				class="tab"
				class:active={activeIndex === i}
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
			class="panel"
			class:active={activeIndex === i}
			hidden={activeIndex !== i}
		>
			<p class="description">{example.description}</p>
			<CodeBlock code={example.code} />
		</div>
	{/each}
</div>

<style>
	.example-carousel {
		width: 100%;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 0.25rem;
		scrollbar-width: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.tab {
		flex-shrink: 0;
		padding: 0.625rem 1rem;
		font-family: var(--font-sans);
		font-size: 0.8125rem;
		font-weight: 400;
		color: rgb(115 115 115);
		background: transparent;
		border: 1px solid rgb(229 229 229);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.tab:hover {
		color: rgb(64 64 64);
		border-color: rgb(200 200 200);
	}

	.tab:focus-visible {
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 2px;
	}

	.tab.active {
		color: oklch(0.476 0.296 265);
		border-color: oklch(0.476 0.296 265 / 0.3);
		background: oklch(0.476 0.296 265 / 0.05);
	}

	.panel {
		display: none;
	}

	.panel.active {
		display: block;
	}

	.description {
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		line-height: 1.6;
		color: rgb(115 115 115);
		margin-bottom: 1rem;
	}
</style>
