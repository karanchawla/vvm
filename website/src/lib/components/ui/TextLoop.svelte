<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		children: string[];
		class?: string;
		interval?: number;
	}

	let { children, class: className = '', interval = 3 }: Props = $props();

	let currentIndex = $state(0);
	let isAnimating = $state(false);
	let direction = $state<'in' | 'out'>('in');

	onMount(() => {
		const timer = setInterval(() => {
			direction = 'out';
			isAnimating = true;

			setTimeout(() => {
				currentIndex = (currentIndex + 1) % children.length;
				direction = 'in';

				setTimeout(() => {
					isAnimating = false;
				}, 300);
			}, 300);
		}, interval * 1000);

		return () => clearInterval(timer);
	});
</script>

<span class="relative inline-flex overflow-hidden {className}" aria-live="polite" aria-atomic="true">
	<span
		class="text-loop-item"
		class:animate-out={direction === 'out' && isAnimating}
		class:animate-in={direction === 'in' && isAnimating}
	>
		{children[currentIndex]}
	</span>
</span>

<style>
	.text-loop-item {
		display: inline-block;
		transition:
			transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.animate-out {
		transform: translateY(-20px) rotateX(-90deg);
		opacity: 0;
		filter: blur(4px);
	}

	.animate-in {
		animation: slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes slide-in {
		from {
			transform: translateY(20px) rotateX(90deg);
			opacity: 0;
			filter: blur(4px);
		}
		to {
			transform: translateY(0) rotateX(0deg);
			opacity: 1;
			filter: blur(0px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.text-loop-item {
			transition: opacity 0.3s ease;
		}

		.animate-out {
			transform: none;
			filter: none;
		}

		.animate-in {
			animation: fade-in 0.3s ease forwards;
		}

		@keyframes fade-in {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
	}
</style>
