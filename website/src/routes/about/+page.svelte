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
	<meta name="description" content="Learn about VVM - the programming language for AI agents. Understand how language models become universal simulators and why VVM treats this seriously." />
</svelte:head>

<article class="about-page py-12 sm:py-16 px-4 sm:px-6">
	<div class="max-w-2xl mx-auto">
		<!-- Hero -->
		<header class="mb-16">
			<h1 class="page-title font-display text-3xl sm:text-4xl md:text-5xl tracking-wide font-light leading-tight">
				About VVM
			</h1>
		</header>

		<!-- The Accidental Computer -->
		<section class="content-section">
			<h2 class="section-title font-display text-xl sm:text-2xl tracking-wide font-light mb-6">
				The Accidental Computer
			</h2>
			<div class="prose">
				<p>We gave language models access to tools. File systems, code execution, web browsers. We wanted to make them more useful. What we got was a computer.</p>
				<p>A model with a code executor and the ability to iterate on its own outputs is Turing complete. It can compute anything computable. The outputs aren't hypothetical: actual files on disk, actual commits pushed, actual tests run.</p>
				<p class="emphasis">We built a general-purpose computer by accident. VVM is the programming language for it.</p>
			</div>
		</section>

		<!-- Simulators All the Way Down -->
		<section class="content-section">
			<h2 class="section-title font-display text-xl sm:text-2xl tracking-wide font-light mb-6">
				Simulators All the Way Down
			</h2>
			<div class="prose">
				<p>Language models are trained to predict text. But prediction, at sufficient fidelity, becomes something else.</p>
				<p>Give a model a detailed specification and ask it to respond as that system would. The model doesn't look up how similar systems behave. It <em>runs</em> the specification. Simulation, pushed far enough, stops being simulation.</p>
				<p>When Claude Code refactors your codebase, the files actually change. When it opens a pull request, the PR exists. The boundary between "simulating work" and "doing work" has dissolved.</p>
				<p>VVM treats this seriously. A <code>.vvm</code> program handed to a capable model doesn't get described. It gets executed. The model becomes the virtual machine. Nodes spawn real subagents. Outputs are real artifacts. Errors need real handling.</p>
			</div>
		</section>

		<!-- The Inversion -->
		<section class="content-section">
			<h2 class="section-title font-display text-xl sm:text-2xl tracking-wide font-light mb-6">
				The Inversion
			</h2>
			<div class="prose">
				<p>Conventional agent frameworks orchestrate from outside. Your Python calls the model, parses the output, decides what to do next, calls it again. The locus of control sits in your application code. The model is a function you invoke.</p>
				<p>VVM inverts this. Hand the program to the model and the model becomes the runtime, parsing dependencies, spawning subagents, managing context. The locus of control moves inside the intelligence itself.</p>
				<p>This enables something external orchestration cannot do: semantic predicates.</p>
				<p>When control lives outside, branching conditions must be computable by your code. So you write <code>if confidence_score > 0.8</code>. A proxy metric. An attempt to operationalize "is this good enough?" into a boolean your orchestrator can evaluate. The proxy is always lossy. "Production ready" is a gestalt judgment. Reducing it to a threshold discards most of the signal.</p>
				<p>When control lives inside the model, predicates can be semantic directly. "Is this production ready?" becomes a question the runtime answers by reading and judging. No proxy required. The runtime operates in semantic space natively. VVM lets you write programs that do too.</p>
			</div>
		</section>

		<!-- The Precision Problem -->
		<section class="content-section">
			<h2 class="section-title font-display text-xl sm:text-2xl tracking-wide font-light mb-6">
				The Precision Problem
			</h2>
			<div class="prose">
				<p>English handles intent beautifully. It collapses under structural pressure.</p>
				<p>"Analyze this and summarize the key points" is clear. But which parts run concurrently? What counts as done? If step three fails, does step four run? How many retries? What's "good enough" to proceed?</p>
				<p>These questions have answers in your head. They don't survive the trip through natural language.</p>
				<p>VVM separates concerns: structure expressed structurally, intent left as natural language. Unambiguous where ambiguity hurts, flexible where rigidity would.</p>
			</div>
		</section>

		<!-- Open Source -->
		<section class="content-section">
			<h2 class="section-title font-display text-xl sm:text-2xl tracking-wide font-light mb-6">
				Open Source. No Lock-In.
			</h2>
			<div class="prose">
				<p>VVM is open source. The spec is public. Your programs are yours.</p>
				<p>We think infrastructure wants to be shared. Proprietary orchestration locks you into a vendor's model, tools, and roadmap. VVM programs are portable. Any runtime that implements the spec can execute them.</p>
				<p class="emphasis">Lock-in should come from capability, not format.</p>
			</div>
		</section>

		<!-- FAQ -->
		<section class="content-section">
			<h2 class="section-title font-display text-xl sm:text-2xl tracking-wide font-light mb-8">
				FAQ
			</h2>
			<Faq items={faqItems} />
		</section>
	</div>
</article>

<style>
	.page-title {
		color: oklch(0.476 0.296 265);
	}

	.section-title {
		color: oklch(0.476 0.296 265);
		scroll-margin-top: 2rem;
	}

	.content-section {
		margin-bottom: 4rem;
	}

	.content-section:last-child {
		margin-bottom: 0;
	}

	.prose {
		font-family: var(--font-sans);
		font-size: 1rem;
		line-height: 1.75;
		color: rgb(64 64 64);
	}

	.prose p {
		margin-bottom: 1.25rem;
	}

	.prose p:last-child {
		margin-bottom: 0;
	}

	.prose em {
		font-style: italic;
	}

	.prose code {
		font-family: var(--font-mono);
		font-size: 0.875em;
		background: rgb(245 245 245);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		color: rgb(64 64 64);
	}

	.prose .emphasis {
		font-weight: 500;
		color: rgb(38 38 38);
	}
</style>
