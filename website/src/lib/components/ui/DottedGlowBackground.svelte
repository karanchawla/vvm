<script lang="ts">
	interface Props {
		class?: string;
		gap?: number;
		radius?: number;
		color?: string;
		glowColor?: string;
		opacity?: number;
		backgroundOpacity?: number;
		speedMin?: number;
		speedMax?: number;
		speedScale?: number;
	}

	let {
		class: className = '',
		gap = 12,
		radius = 2,
		color = 'rgba(163, 163, 163, 0.7)',
		glowColor = 'oklch(0.476 0.296 265 / 0.85)',
		opacity = 0.6,
		backgroundOpacity = 0,
		speedMin = 0.4,
		speedMax = 1.3,
		speedScale = 1
	}: Props = $props();

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;

	type Dot = { x: number; y: number; phase: number; speed: number };

	$effect(() => {
		if (!canvasEl || !containerEl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		let raf = 0;
		let stopped = false;
		let dots: Dot[] = [];

		const dpr = Math.max(1, window.devicePixelRatio || 1);

		const resize = () => {
			const { width, height } = containerEl.getBoundingClientRect();
			canvasEl.width = Math.max(1, Math.floor(width * dpr));
			canvasEl.height = Math.max(1, Math.floor(height * dpr));
			canvasEl.style.width = `${Math.floor(width)}px`;
			canvasEl.style.height = `${Math.floor(height)}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const regenDots = () => {
			dots = [];
			const { width, height } = containerEl.getBoundingClientRect();
			const cols = Math.ceil(width / gap) + 2;
			const rows = Math.ceil(height / gap) + 2;
			const min = Math.min(speedMin, speedMax);
			const max = Math.max(speedMin, speedMax);

			for (let i = -1; i < cols; i++) {
				for (let j = -1; j < rows; j++) {
					const x = i * gap + (j % 2 === 0 ? 0 : gap * 0.5);
					const y = j * gap;
					const phase = Math.random() * Math.PI * 2;
					const span = Math.max(max - min, 0);
					const speed = min + Math.random() * span;
					dots.push({ x, y, phase, speed });
				}
			}
		};

		const draw = (now: number) => {
			if (stopped) return;

			const { width, height } = containerEl.getBoundingClientRect();

			ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
			ctx.globalAlpha = opacity;

			if (backgroundOpacity > 0) {
				const grad = ctx.createRadialGradient(
					width * 0.5,
					height * 0.4,
					Math.min(width, height) * 0.1,
					width * 0.5,
					height * 0.5,
					Math.max(width, height) * 0.7
				);
				grad.addColorStop(0, 'rgba(0,0,0,0)');
				grad.addColorStop(1, `rgba(0,0,0,${Math.min(Math.max(backgroundOpacity, 0), 1)})`);
				ctx.fillStyle = grad;
				ctx.fillRect(0, 0, width, height);
			}

			ctx.save();
			ctx.fillStyle = color;

			const time = (now / 1000) * Math.max(speedScale, 0);

			for (let i = 0; i < dots.length; i++) {
				const d = dots[i];
				const mod = (time * d.speed + d.phase) % 2;
				const lin = mod < 1 ? mod : 2 - mod;
				const a = 0.25 + 0.55 * lin;

				if (a > 0.6) {
					const glow = (a - 0.6) / 0.4;
					ctx.shadowColor = glowColor;
					ctx.shadowBlur = 6 * glow;
				} else {
					ctx.shadowColor = 'transparent';
					ctx.shadowBlur = 0;
				}

				ctx.globalAlpha = a * opacity;
				ctx.fillRect(d.x - radius, d.y - radius, radius * 2, radius * 2);
			}

			ctx.restore();
			raf = requestAnimationFrame(draw);
		};

		const handleResize = () => {
			resize();
			regenDots();
		};

		const ro = new ResizeObserver(handleResize);
		ro.observe(containerEl);

		resize();
		regenDots();
		raf = requestAnimationFrame(draw);

		return () => {
			stopped = true;
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
</script>

<div bind:this={containerEl} class="absolute inset-0 {className}">
	<canvas bind:this={canvasEl} class="block h-full w-full"></canvas>
</div>
