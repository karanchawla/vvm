<script lang="ts">
	let { code, class: className = '' }: { code: string; class?: string } = $props();

	// Simple syntax highlighting for VVM
	function highlight(source: string): string {
		return source
			.split('\n')
			.map((line) => {
				// Comments - handle first, return early
				if (line.trim().startsWith('#')) {
					return '<span class="hl-comment">' + escapeForHtml(line) + '</span>';
				}

				// Escape HTML entities first
				let result = escapeForHtml(line);

				// Keywords (must come before other replacements)
				result = result.replace(
					/\b(agent|def|match|case|if|elif|else|for|while|in|return|export|require|constrain|refine|try|except|finally|import|from|and|or|not)\b/g,
					'<span class="hl-keyword">$1</span>'
				);

				// Built-in functions
				result = result.replace(
					/\b(pack|pmap|filter|reduce|map|print)\b/g,
					'<span class="hl-builtin">$1</span>'
				);

				// Agent calls @name
				result = result.replace(/@(\w+)/g, '<span class="hl-agent">@$1</span>');

				// Semantic predicates ?\`...\`
				result = result.replace(
					/\?\`([^`]*)\`/g,
					'<span class="hl-predicate">?`$1`</span>'
				);

				// Backtick strings (but not already highlighted predicates)
				result = result.replace(
					/(?<!<span class="hl-predicate">)\`([^`]*)\`/g,
					'<span class="hl-string">`$1`</span>'
				);

				// Double-quoted strings
				result = result.replace(
					/&quot;([^&]*)&quot;/g,
					'<span class="hl-string">&quot;$1&quot;</span>'
				);

				// Numbers
				result = result.replace(
					/\b(\d+)\b/g,
					'<span class="hl-number">$1</span>'
				);

				return result;
			})
			.join('\n');
	}

	function escapeForHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}
</script>

<div class="code-block {className}">
	<pre><code>{@html highlight(code)}</code></pre>
</div>

<style>
	.code-block {
		background: rgb(250 250 250);
		border: 1px solid rgb(229 229 229);
		border-radius: 8px;
		overflow: hidden;
	}

	pre {
		margin: 0;
		padding: 1.25rem 1.5rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.7;
		color: rgb(64 64 64);
		display: block;
		white-space: pre;
	}

	/* Use unique class prefix to avoid conflicts */
	:global(.hl-comment) {
		color: rgb(140 140 140);
		font-style: italic;
	}

	:global(.hl-keyword) {
		color: oklch(0.476 0.296 265);
		font-weight: 500;
	}

	:global(.hl-builtin) {
		color: oklch(0.55 0.2 200);
	}

	:global(.hl-agent) {
		color: oklch(0.45 0.2 150);
		font-weight: 500;
	}

	:global(.hl-predicate) {
		color: oklch(0.5 0.22 30);
		font-weight: 500;
	}

	:global(.hl-string) {
		color: oklch(0.45 0.15 145);
	}

	:global(.hl-number) {
		color: oklch(0.55 0.2 30);
	}
</style>
