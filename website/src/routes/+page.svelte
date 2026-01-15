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
			code: `# Route tickets by understanding, not keywords
ticket = {
  id: "TKT-4821",
  message: "I was charged twice for my subscription"
}

match ticket:
  case ?'billing, payment, or refund issue':
    team = "billing"
    priority = "high"
  case ?'account access or login problem':
    team = "security"
    priority = "urgent"
  case ?'bug report or technical error':
    team = "engineering"
    priority = "medium"
  case _:
    team = "general-support"
    priority = "medium"

export { ticket_id: ticket.id, team, priority }`
		},
		{
			title: 'Code Reviewer',
			description:
				'Reviewer critiques. Coder improves. Repeat until it passes or you hit the limit.',
			code: `# Iterative improvement with evaluator-optimizer
agent coder(model="sonnet", prompt="Write clean, tested code.")
agent reviewer(model="opus", prompt="Review critically. Find issues.")

def passes_review(code, iteration):
  review = @reviewer \`Review this code. If production-ready, say APPROVED.\`(code)
  return ?'contains APPROVED with no issues'(review)

def apply_feedback(code, iteration):
  review = @reviewer \`What's the biggest issue with this code?\`(code)
  return @coder \`Fix this issue: {review}\`(pack(code, review))

# Loop until approved or 5 iterations
final_code = refine(
  initial_code,
  max=5,
  done=passes_review,
  step=apply_feedback
)

export final_code`
		},
		{
			title: 'Research Agent',
			description:
				'Define the agent once. Run it on anything. The difference between shell commands and a script.',
			code: `# A reusable agent for explanations
agent explainer(
  model="sonnet",
  prompt="Explain concepts simply. Use analogies."
)

topic = "quantum computing"

explanation = @explainer \`Explain {topic} as if to a curious
teenager. Use a concrete analogy from everyday life.\`(topic)

# Ensure quality before returning
constrain explanation():
  require ?'uses a clear, relatable analogy'
  require ?'avoids unnecessary jargon'
  require ?'would make sense to a non-expert'

export explanation`
		}
	];

	const concepts = [
		{
			title: 'Model as Runtime',
			description:
				'Frameworks call the model like a function. VVM hands it the program. The intelligence doesn\'t execute steps—it interprets them.'
		},
		{
			title: 'Semantic Predicates',
			description:
				'Python conditions must be computable: confidence > 0.8. VVM conditions are semantic: "Is this production ready?" That\'s a question, not a threshold.'
		},
		{
			title: 'Open Standard',
			description:
				'Claude Code today. Codex, Amp, OpenCode planned. The spec is public. Standards win by being used.'
		}
	];
</script>

<svelte:head>
	<title>VVM - Programs, Not Prompts</title>
	<meta
		name="description"
		content="VVM is a programming language for AI agents. Write reusable programs for agentic workflows instead of prompting each time."
	/>
</svelte:head>

<div class="page transition-opacity duration-700 {mounted ? 'opacity-100' : 'opacity-0'}">
	<!-- Hero Section -->
	<section class="hero">
		<ProBadge class="mb-8" />

		<h1 class="title font-display">Programs, Not Prompts</h1>

		<p class="subtitle">
			From chat sessions to reproducible intelligence. Describe the workflow once with explicit
			dependencies, error handling, and quality constraints. Then run it repeatedly.
		</p>

		<div class="buttons">
			<a href="https://github.com/anthropics/vvm" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
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
			<a href="https://github.com/anthropics/vvm/tree/main/examples" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">
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

	<!-- Concepts Section -->
	<section class="concepts">
		<div class="section-header">
			<h2 class="section-title font-display">How It Works</h2>
			<p class="section-description">
				You've been programming a computer without realizing it. We've been doing it with chat
				messages. That works until it doesn't.
			</p>
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

	/* Concepts Grid */
	.concepts-grid {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.concepts-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 768px) {
		.concepts-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
