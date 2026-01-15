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
		padding: 1.5rem;
		background: rgb(250 250 250);
		border: 1px solid rgb(229 229 229);
		border-radius: 8px;
		transition: border-color 0.15s ease;
	}

	.concept-card:hover {
		border-color: oklch(0.476 0.296 265 / 0.3);
	}

	.title {
		font-size: 1.125rem;
		font-weight: 300;
		color: oklch(0.476 0.296 265);
		margin-bottom: 0.75rem;
		letter-spacing: 0.01em;
	}

	.description {
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		line-height: 1.65;
		color: rgb(64 64 64);
		margin: 0;
	}
</style>
