<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<span
	class="pro-badge inline-flex items-center gap-1.5 px-3 py-1 text-xs font-sans tracking-wider uppercase rounded-full {className}"
>
	<span class="pulse-dot" aria-hidden="true"></span>
	<span>Pro Coming Soon</span>
</span>

<style>
	.pro-badge {
		background: oklch(0.476 0.296 265 / 0.1);
		color: oklch(0.476 0.296 265);
		border: 1px solid oklch(0.476 0.296 265 / 0.2);
	}

	.pulse-dot {
		width: 6px;
		height: 6px;
		background: oklch(0.476 0.296 265);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(0.8);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse-dot {
			animation: none;
		}
	}
</style>
