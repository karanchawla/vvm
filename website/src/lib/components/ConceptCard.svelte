<script lang="ts">
	let {
		title,
		description,
		class: className = ''
	}: { title: string; description: string; class?: string } = $props();
</script>

<article class="concept-card {className}">
	<h3 class="title font-display">{title}</h3>
	<p class="description">{description}</p>
</article>

<style>
	.concept-card {
		padding: 1.25rem;
		background: var(--card-bg);
		border: 1px solid var(--border-primary);
		border-radius: 8px;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	@media (min-width: 640px) {
		.concept-card {
			padding: 1.5rem;
		}
	}

	.concept-card:hover {
		border-color: var(--accent-border);
		background: var(--card-bg-hover);
	}

	.concept-card:focus-within {
		border-color: var(--accent-border);
		outline: 2px solid var(--accent-border-active);
		outline-offset: 2px;
	}

	.title {
		font-size: 1rem;
		font-weight: 300;
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		letter-spacing: 0.01em;
	}

	@media (min-width: 640px) {
		.title {
			font-size: 1.125rem;
			margin-bottom: 0.75rem;
		}
	}

	.description {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0;
	}

	@media (min-width: 640px) {
		.description {
			font-size: 0.9375rem;
			line-height: 1.65;
		}
	}
</style>
