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
		background: rgb(250 250 250);
		border: 1px solid rgb(229 229 229);
		border-radius: 8px;
		transition: border-color 0.15s ease;
	}

	@media (min-width: 640px) {
		.concept-card {
			padding: 1.5rem;
		}
	}

	.concept-card:hover {
		border-color: oklch(0.476 0.296 265 / 0.3);
	}

	.title {
		font-size: 1rem;
		font-weight: 300;
		color: oklch(0.476 0.296 265);
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
		color: rgb(64 64 64);
		margin: 0;
	}

	@media (min-width: 640px) {
		.description {
			font-size: 0.9375rem;
			line-height: 1.65;
		}
	}
</style>
