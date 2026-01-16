<script lang="ts">
	import DottedGlowBackground from './ui/DottedGlowBackground.svelte';
	import TextLoop from './ui/TextLoop.svelte';
	import Section from './ui/Section.svelte';
	import Container from './ui/Container.svelte';
	import Logo from './ui/Logo.svelte';

	const rotatingWords = ['AI sessions', 'machines that understand', 'intelligent runtimes', 'workflows that judge', 'the new computer'];
</script>

<footer class="footer relative">
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

			<p class="description font-sans text-sm sm:text-base leading-relaxed pl-1">
				A programming language for <TextLoop class="font-medium inline-block min-w-[12em]" style="color: var(--accent-color)" children={rotatingWords} interval={3} />
			</p>

			<div class="credits font-mono text-xs text-center mt-4 sm:mt-5">
				<p>
					&copy; 2026
					<a href="https://x.com/thekaranchawla" target="_blank" rel="noopener noreferrer" class="footer-link">
						Karan Chawla
					</a>
				</p>
				<p class="support-line">
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
	.footer {
		border-top: 1px solid var(--border-primary);
	}

	.description {
		color: var(--text-tertiary);
	}

	.credits {
		color: var(--text-muted);
	}

	.support-line {
		color: var(--text-faint);
	}

	.footer-link {
		transition: color 0.15s ease;
	}

	.footer-link:hover {
		color: var(--accent-color);
	}

	.footer-link:focus-visible {
		color: var(--accent-color);
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>
