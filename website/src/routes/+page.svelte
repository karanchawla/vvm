<script lang="ts">
	import { onMount } from 'svelte';
	import ProBadge from '$lib/components/ProBadge.svelte';
	import ExampleCarousel from '$lib/components/ExampleCarousel.svelte';
	import ConceptCard from '$lib/components/ConceptCard.svelte';

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const examples = [
		{
			title: 'Ticket Router',
			description:
				'No regex. No keyword lists. The model reads the ticket and understands what it means.',
			code: `# Route tickets by semantic understanding
ticket = {
  id: "TKT-4821",
  message: "I was charged twice for my subscription last month",
  customer_tier: "premium"
}

match ticket:
  case ?\`billing, payment, or refund issue\`:
    team = "billing"
    priority = "high"
  case ?\`account access or login problem\`:
    team = "security"
    priority = "urgent"
  case ?\`bug report or technical error\`:
    team = "engineering"
    priority = "medium"
  case _:
    team = "general-support"
    priority = "medium"

export { ticket_id: ticket.id, assigned_team: team, priority: priority }`
		},
		{
			title: 'Code Reviewer',
			description:
				'Reviewer critiques. Coder improves. Repeat until it passes or you hit the limit.',
			code: `# Iterative improvement with evaluator-optimizer
agent coder(model="sonnet", prompt="Write clean, well-tested code.")
agent reviewer(model="opus", prompt="Review code critically. Find bugs and issues.")

def passes_review(code, iteration):
  review = @reviewer \`Review this code. List any bugs or improvements needed.
If production-ready with no issues, respond with "APPROVED".\`(code)
  return ?\`contains APPROVED with no significant issues listed\`(review)

def apply_feedback(code, iteration):
  review = @reviewer \`Review this code critically. Focus on bugs,
edge cases, input validation, and clarity.\`(code)
  improved = @coder \`Improve this code based on the review.
Code: {code}
Review: {review}\`(pack(code, review))
  return improved

final_code = refine(initial_code, max=5, done=passes_review, step=apply_feedback)

export final_code`
		},
		{
			title: 'Parallel Launch',
			description:
				'Five translations at once. pmap fans out, waits for all, returns in order. No async/await.',
			code: `# Translate a product launch to 5 languages simultaneously
agent translator(model="sonnet", prompt="Translate accurately, preserving tone.")

product_copy = "Introducing CloudSync Pro: real-time sync, end-to-end encryption, offline mode."

languages = ["Spanish", "French", "German", "Japanese", "Portuguese"]

def translate_to(language):
  return @translator \`Translate to {language}: {product_copy}\`(pack(language, product_copy))

# pmap runs ALL translations concurrently - 5x faster than sequential
translations = pmap(languages, translate_to)

export translations`
		}
	];

	const concepts = [
		{
			title: 'Define Workers',
			description:
				'A researcher with web access. An analyst for synthesis. A writer for polish. Each agent is a configuration: model, prompt, skills, permissions. You build the team.'
		},
		{
			title: 'Specify Structure',
			description:
				'This depends on that. These run in parallel. Retry on failure. The workflow in your head, made explicit and unambiguous.'
		},
		{
			title: 'Set the Bar',
			description:
				'"At least five citations." "No hallucinations." "Executive reading level." Quality gates the runtime evaluates by comprehension, not by counting.'
		},
		{
			title: 'Execute',
			description:
				'Hand your .vvm file to Claude Code. It parses, spawns subagents, manages context, enforces constraints. What comes out are artifacts you can use.'
		}
	];
</script>

<svelte:head>
	<title>VVM - A Language for AI Computers</title>
	<meta
		name="description"
		content="A language model with tool access is a general-purpose computer. VVM lets you program it."
	/>
</svelte:head>

<div class="page transition-opacity duration-700 {mounted ? 'opacity-100' : 'opacity-0'}">
	<!-- Hero Section -->
	<section class="hero">
		<ProBadge class="mb-8" />

		<h1 class="title font-display">You've been using a computer. Now there's a language for it.</h1>

		<p class="subtitle">
			A language model with tool access is a general-purpose computer. VVM lets you program it.
		</p>

		<div class="buttons">
			<a href="https://github.com/karanchawla/vvm" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
				<svg
					class="github-icon"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
					/>
				</svg>
				Star on GitHub
			</a>
			<a href="https://github.com/karanchawla/vvm/tree/main/examples" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">
				View Examples
			</a>
		</div>
	</section>

	<!-- Examples Section -->
	<section class="examples">
		<div class="section-header">
			<h2 class="section-title font-display">See It Work</h2>
			<p class="section-description">
				Simple tasks are fine as chat. Complex tasks need structure.
			</p>
		</div>

		<ExampleCarousel {examples} />
	</section>

	<!-- How It Works Section -->
	<section class="concepts">
		<div class="section-header">
			<h2 class="section-title font-display">How It Works</h2>
		</div>

		<div class="concepts-grid">
			{#each concepts as concept}
				<ConceptCard title={concept.title} description={concept.description} />
			{/each}
		</div>
	</section>
</div>

<style>
	.page {
		padding: 0 1rem;
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: 4rem 0 5rem;
		max-width: 42rem;
		margin: 0 auto;
	}

	.title {
		font-size: 2rem;
		font-weight: 300;
		letter-spacing: 0.01em;
		color: oklch(0.476 0.296 265);
		margin-bottom: 1.25rem;
		line-height: 1.2;
	}

	@media (min-width: 640px) {
		.title {
			font-size: 2.5rem;
		}
	}

	@media (min-width: 768px) {
		.title {
			font-size: 3rem;
		}
	}

	.subtitle {
		font-family: var(--font-sans);
		font-size: 1rem;
		line-height: 1.7;
		color: rgb(115 115 115);
		max-width: 32rem;
		margin: 0 auto 2.5rem;
	}

	@media (min-width: 640px) {
		.subtitle {
			font-size: 1.0625rem;
		}
	}

	.buttons {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-family: var(--font-sans);
		font-size: 0.875rem;
		font-weight: 400;
		border-radius: 6px;
		text-decoration: none;
		transition: all 0.15s ease;
		min-height: 44px;
	}

	.btn:focus-visible {
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 2px;
	}

	.btn-primary {
		background: oklch(0.476 0.296 265);
		color: white;
		border: 1px solid oklch(0.476 0.296 265);
	}

	.btn-primary:hover {
		background: oklch(0.42 0.296 265);
		border-color: oklch(0.42 0.296 265);
	}

	.btn-secondary {
		background: white;
		color: rgb(64 64 64);
		border: 1px solid rgb(229 229 229);
	}

	.btn-secondary:hover {
		border-color: rgb(200 200 200);
		color: rgb(38 38 38);
	}

	.github-icon {
		width: 1rem;
		height: 1rem;
	}

	/* Sections */
	.examples,
	.concepts {
		max-width: 48rem;
		margin: 0 auto;
		padding: 3rem 0;
	}

	.section-header {
		margin-bottom: 2rem;
	}

	.section-title {
		font-size: 1.375rem;
		font-weight: 300;
		letter-spacing: 0.01em;
		color: oklch(0.476 0.296 265);
		margin-bottom: 0.75rem;
	}

	@media (min-width: 640px) {
		.section-title {
			font-size: 1.5rem;
		}
	}

	.section-description {
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		line-height: 1.7;
		color: rgb(115 115 115);
		max-width: 36rem;
	}

	/* Concepts Grid - 2x2 */
	.concepts-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 640px) {
		.concepts-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
