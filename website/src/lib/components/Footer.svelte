<script lang="ts">
	import DottedGlowBackground from './ui/DottedGlowBackground.svelte';
	import TextLoop from './ui/TextLoop.svelte';
	import Section from './ui/Section.svelte';
	import Container from './ui/Container.svelte';
	import Logo from './ui/Logo.svelte';

	const rotatingWords = ['AI sessions', 'machines that understand', 'intelligent runtimes', 'workflows that judge', 'the new computer'];
</script>

<footer class="relative border-t border-edge dark:border-edge-dark">
	<DottedGlowBackground
		class="pointer-events-none"
		opacity={0.15}
		gap={14}
		radius={1.5}
		speedMin={0.4}
		speedMax={1.5}
		speedScale={1}
	/>

	<Section class="relative">
		<Container class="grid gap-2 sm:gap-3">
			<Logo size={36} />

			<p class="font-sans text-sm sm:text-base leading-relaxed pl-1 text-ink-tertiary dark:text-ink-dark-tertiary">
				A programming language for <TextLoop class="font-medium inline-block min-w-[12em] text-brand dark:text-white" children={rotatingWords} interval={3} />
			</p>

			<div class="font-mono text-xs text-center mt-4 sm:mt-5 text-ink-muted dark:text-ink-dark-muted">
				<p>
					&copy; 2026
					<a href="https://x.com/thekaranchawla" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-brand dark:hover:text-white focus-visible:text-brand dark:focus-visible:text-white focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-2 focus-visible:rounded-sm">
						Karan Chawla
					</a>
				</p>
				<p class="text-ink-faint dark:text-ink-dark-faint">
				Supported by
				<a
					href="https://bags.fm/HWbNnWxMokZygvhKnYbDfZfRaokXHvF3uVHvnKSdBAGS"
					target="_blank"
					rel="noopener noreferrer"
					class="transition-colors hover:text-brand dark:hover:text-white focus-visible:text-brand dark:focus-visible:text-white focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-2 focus-visible:rounded-sm"
				>
					$VVM
				</a>
				on
				<a href="https://x.com/BagsApp" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-brand dark:hover:text-white focus-visible:text-brand dark:focus-visible:text-white focus-visible:outline-2 focus-visible:outline-brand/50 dark:focus-visible:outline-white/40 focus-visible:outline-offset-2 focus-visible:rounded-sm">BagsApp</a>
			</p>
			</div>

		</Container>
	</Section>
</footer>
