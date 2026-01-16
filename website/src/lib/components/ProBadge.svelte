<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<span
	class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-sans tracking-wider uppercase rounded-full bg-brand/10 dark:bg-white/10 text-brand dark:text-white border border-brand/20 dark:border-white/15 {className}"
>
	<span class="pulse-dot size-1.5 bg-brand dark:bg-white rounded-full" aria-hidden="true"></span>
	<span>Pro Coming Soon</span>
</span>

<style>
	.pulse-dot {
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
