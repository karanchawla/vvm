<footer>
	<div class="flex items-center justify-center gap-3 mb-2">
		<p class="font-mono text-xs text-neutral-500 leading-normal">
			&copy; 2026 <a href="https://x.com/thekaranchawla" target="_blank" rel="noopener noreferrer">Karan Chawla</a>
		</p>
		<a
			href="https://github.com/karanchawla/vvm"
			target="_blank"
			rel="noopener noreferrer"
			class="github-link"
			aria-label="VVM on GitHub"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
			</svg>
		</a>
	</div>
	<p class="text-center font-mono text-xs text-neutral-400 mb-3 leading-normal">
		Supported by
		<a
			href="https://bags.fm/HWbNnWxMokZygvhKnYbDfZfRaokXHvF3uVHvnKSdBAGS"
			target="_blank"
			rel="noopener noreferrer"
		>
			$VVM
		</a>
		on
		<a
			href="https://x.com/BagsApp"
			target="_blank"
			rel="noopener noreferrer"
		>
			BagsApp
		</a>
	</p>
	<div class="dither-footer h-6 sm:h-8 w-full" aria-hidden="true"></div>
</footer>

<style>
	.github-link {
		display: inline-flex;
		color: rgb(163 163 163);
		text-decoration: none;
		padding: 0.5rem;
		margin: -0.5rem;
		border-radius: 4px;
		transition: color 0.15s ease;
	}

	.github-link:hover {
		color: oklch(0.476 0.296 265);
		text-decoration: none;
	}

	.github-link:focus-visible {
		color: oklch(0.476 0.296 265);
		outline: 2px solid oklch(0.476 0.296 265 / 0.5);
		outline-offset: 2px;
	}

	.dither-footer {
		background-image: url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h1v1H0V0zm2 0h1v1H2V0zm1 1h1v1H3V1zm-2 0h1v1H1V1zm0 2h1v1H1V3zm2 0h1v1H3V3zM0 2h1v1H0V2zm2 2h1v1H2V4z' fill='%23d4d4d4' fill-rule='evenodd'/%3E%3C/svg%3E");
		background-repeat: repeat;
		mask-image: linear-gradient(to bottom, transparent, black 50%);
		-webkit-mask-image: linear-gradient(to bottom, transparent, black 50%);
	}
</style>
