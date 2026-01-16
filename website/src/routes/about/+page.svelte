<script lang="ts">
	import Faq from '$lib/components/Faq.svelte';

	const faqItems = [
		{
			question: "What does VVM actually do?",
			answer: "It lets you write reusable programs for agentic workflows. Instead of prompting each time, describe the workflow once with explicit dependencies, error handling, and quality constraints. Then run it repeatedly. The difference between typing shell commands and writing a script."
		},
		{
			question: "How is VVM different from LangChain, CrewAI, AutoGPT?",
			answer: "Those frameworks orchestrate from outside: Python that calls APIs and puppeteers the model through operations. VVM is interpreted by the model itself. You hand the spec to the agent and the agent becomes the runtime. The model can reason about the program it's running, adapt when things fail, and make judgment calls that would require brittle heuristics in external code."
		},
		{
			question: "What runtimes support VVM?",
			answer: "Today: Claude Code. Planned: Codex, Amp, OpenCode. The spec is runtime-agnostic, so it runs anywhere a capable agent can interpret it."
		},
		{
			question: "Is this working or theoretical?",
			answer: "Working. VVM programs execute today. The model parses the program, constructs the dependency graph, and runs it. Real outputs, real errors, real artifacts."
		},
		{
			question: "What happens when the AI fails mid-execution?",
			answer: "Errors are values. Failures propagate through the graph like any result. Your program matches on error types and responds: retry, fall back, take an alternative path, or surface the failure. Structured error handling, not black-box debugging."
		},
		{
			question: "Why open source?",
			answer: "We're betting on a paradigm, not a product. If AI sessions are a new compute substrate, the right move is to grow the ecosystem, not capture it. Standards win by being used."
		}
	];
</script>

<svelte:head>
	<title>About - VVM</title>
	<meta name="description" content="VVM is a programming language for AI agents. Learn how language models become runtimes and why that changes everything." />
</svelte:head>

<article class="py-12 sm:py-16 px-4 sm:px-6">
	<div class="max-w-2xl mx-auto">
		<!-- Intro -->
		<header class="mb-16">
			<h1 class="sr-only">About VVM</h1>
			<div class="font-sans text-base leading-7 text-ink-secondary dark:text-ink-dark-secondary space-y-5">
				<p>You've been programming a computer without realizing it.</p>
				<p>Every time you use Claude Code, Cursor, or Codex, you're instructing a machine that can read files, write code, execute commands, and iterate on its own outputs. That's not an assistant. That's a general-purpose computer that understands meaning.</p>
				<p>We've been programming it with chat messages. That works until it doesn't.</p>
			</div>
		</header>

		<!-- When English Breaks Down -->
		<section class="mb-16">
			<h2 class="font-display text-xl sm:text-2xl tracking-wide font-light mb-6 text-brand dark:text-white scroll-mt-8">
				When English Breaks Down
			</h2>
			<div class="font-sans text-base leading-7 text-ink-secondary dark:text-ink-dark-secondary space-y-5">
				<p>Simple tasks are fine. "Refactor this function" needs no specification.</p>
				<p>Complex tasks fall apart. You want three analyses to run in parallel, feed into a synthesis, retry on failure, and only proceed if the output meets a quality bar. You can say that in English. But which parts are instructions and which are suggestions? What happens if you're ambiguous about the retry logic? The model will do something. It might not be what you meant.</p>
				<p class="font-medium text-ink dark:text-ink-dark">English handles intent. It can't handle structure.</p>
			</div>
		</section>

		<!-- The model is the runtime -->
		<section class="mb-16">
			<h2 class="font-display text-xl sm:text-2xl tracking-wide font-light mb-6 text-brand dark:text-white scroll-mt-8">
				The Model Is the Runtime
			</h2>
			<div class="font-sans text-base leading-7 text-ink-secondary dark:text-ink-dark-secondary space-y-5">
				<p>VVM is a programming language for AI sessions.</p>
				<p>You write a program. You hand it to the model. The model becomes the runtime.</p>
				<p>This inverts the usual pattern. Frameworks like LangChain put the orchestration in your code and treat the model as a function to call. VVM puts the orchestration inside the model. The intelligence doesn't just execute steps—it interprets the program, manages dependencies, and makes decisions about how to proceed.</p>
				<p class="font-medium text-ink dark:text-ink-dark">That's not just cleaner architecture. It enables something new.</p>
			</div>
		</section>

		<!-- Semantic Predicates -->
		<section class="mb-16">
			<h2 class="font-display text-xl sm:text-2xl tracking-wide font-light mb-6 text-brand dark:text-white scroll-mt-8">
				Predicates That Understand
			</h2>
			<div class="font-sans text-base leading-7 text-ink-secondary dark:text-ink-dark-secondary space-y-5">
				<p>When orchestration lives in your Python, branching conditions must be things Python can compute. So you write <code class="font-mono text-[0.875em] bg-surface-tertiary dark:bg-surface-dark-tertiary px-1.5 py-0.5 rounded">if confidence_score > 0.8</code>—a proxy metric, trying to capture "is this good enough?" in a number.</p>
				<p>When orchestration lives in the model, conditions can be semantic. "Is this production ready?" isn't a threshold. It's a question the runtime can answer by reading and judging. The model operates in meaning-space. Now your programs can too.</p>
			</div>
		</section>

		<!-- Open Standard -->
		<section class="mb-16">
			<h2 class="font-display text-xl sm:text-2xl tracking-wide font-light mb-6 text-brand dark:text-white scroll-mt-8">
				Open Standard
			</h2>
			<div class="font-sans text-base leading-7 text-ink-secondary dark:text-ink-dark-secondary space-y-5">
				<p>VVM is open source.</p>
				<p>Today that's Claude Code. Codex, Amp, and OpenCode are planned. The language is runtime-agnostic by design.</p>
			</div>
		</section>

		<!-- FAQ -->
		<section>
			<h2 class="font-display text-xl sm:text-2xl tracking-wide font-light mb-8 text-brand dark:text-white scroll-mt-8">
				FAQ
			</h2>
			<Faq items={faqItems} />
		</section>
	</div>
</article>
