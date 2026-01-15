<script lang="ts">
	import DottedGlowBackground from './ui/DottedGlowBackground.svelte';
	import TextLoop from './ui/TextLoop.svelte';
	import Section from './ui/Section.svelte';
	import Container from './ui/Container.svelte';
	import Logo from './ui/Logo.svelte';

	const rotatingWords = ['AI sessions', 'intelligent runtimes', 'the new computer', 'tools that think'];
</script>

<footer class="relative border-t border-neutral-200">
	<DottedGlowBackground
		class="pointer-events-none"
		opacity={0.15}
		gap={14}
		radius={1.5}
		color="rgb(160, 160, 160)"
		glowColor="oklch(0.476 0.296 265 / 0.6)"
		backgroundOpacity={0}
		speedMin={0.4}
		speedMax={1.5}
		speedScale={1}
	/>

	<Section class="relative">
		<Container class="grid gap-2 sm:gap-3">
			<Logo size={36} />

			<p class="font-sans text-sm sm:text-base text-neutral-600 leading-relaxed pl-1">
				A programming language for <TextLoop class="font-medium text-vvm-purple inline-block min-w-[9em]" children={rotatingWords} interval={3} />
			</p>

			<div class="space-y-1 sm:space-y-2 font-mono text-xs text-neutral-500 text-center mt-4 sm:mt-5">
				<p>
					&copy; 2026
					<a href="https://x.com/thekaranchawla" target="_blank" rel="noopener noreferrer" class="footer-link">
						Karan Chawla
					</a>
				</p>
				<p class="text-neutral-400">
					Supported by
					<a
						href="https://bags.fm/HWbNnWxMokZygvhKnYbDfZfRaokXHvF3uVHvnKSdBAGS"
						target="_blank"
						rel="noopener noreferrer"
						class="footer-link"
					>
						$VVM
					</a>
					on
					<a href="https://x.com/BagsApp" target="_blank" rel="noopener noreferrer" class="footer-link">BagsApp</a>
				</p>
			</div>
		</Container>
	</Section>
</footer>

<style>
	.footer-link {
		transition: color 0.15s ease;
	}

	.footer-link:hover {
		color: oklch(0.476 0.296 265);
	}

	.footer-link:focus-visible {
		color: oklch(0.476 0.296 265);
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>
