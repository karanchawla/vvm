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

<div class="faq-container">
	{#each items as item, index}
		<div class="faq-item">
			<button
				class="faq-question"
				onclick={() => toggle(index)}
				aria-expanded={openIndex === index}
				aria-controls="faq-answer-{index}"
			>
				<span class="question-text">{item.question}</span>
				<span class="chevron" class:open={openIndex === index}>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</span>
			</button>
			<div
				id="faq-answer-{index}"
				class="faq-answer"
				class:open={openIndex === index}
				aria-hidden={openIndex !== index}
			>
				<div class="answer-content">
					{item.answer}
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.faq-container {
		border-top: 1px solid var(--border-primary);
	}

	.faq-item {
		border-bottom: 1px solid var(--border-primary);
	}

	.faq-question {
		width: 100%;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--text-primary);
		transition: color 0.15s ease;
	}

	.faq-question:hover {
		color: var(--accent-color);
	}

	.faq-question:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.question-text {
		flex: 1;
	}

	.chevron {
		flex-shrink: 0;
		color: var(--text-faint);
		transition: transform 0.2s ease, color 0.15s ease;
	}

	.chevron.open {
		transform: rotate(180deg);
		color: var(--accent-color);
	}

	.faq-answer {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.25s ease;
	}

	.faq-answer.open {
		grid-template-rows: 1fr;
	}

	.answer-content {
		overflow: hidden;
		font-family: var(--font-sans);
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--text-muted);
		padding-bottom: 1.25rem;
	}

	.faq-answer:not(.open) .answer-content {
		padding-bottom: 0;
	}
</style>
