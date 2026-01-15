<script lang="ts">
	let { code, class: className = '' }: { code: string; class?: string } = $props();

	// Simple syntax highlighting for VVM
	function highlight(source: string): string {
		// Process line by line to preserve structure
		return source
			.split('\n')
			.map((line) => {
				// Comments
				if (line.trim().startsWith('#')) {
					return `<span class="comment">${escapeHtml(line)}</span>`;
				}

				let result = escapeHtml(line);

				// Keywords
				result = result.replace(
					/\b(agent|def|match|case|if|elif|else|for|while|in|return|export|require|constrain|refine|try|except|finally|import|from|and|or|not)\b/g,
					'<span class="keyword">$1</span>'
				);

				// Built-in functions
				result = result.replace(
					/\b(pack|pmap|filter|reduce|map|print)\b/g,
					'<span class="builtin">$1</span>'
				);

				// Agent calls @name
				result = result.replace(/@(\w+)/g, '<span class="agent">@$1</span>');

				// Semantic predicates ?`...`
				result = result.replace(/\?\`([^`]*)\`/g, '<span class="predicate">?`$1`</span>');

				// Strings (backtick strings and regular strings)
				result = result.replace(/`([^`]*)`/g, '<span class="string">`$1`</span>');
				result = result.replace(/"([^"]*)"/g, '<span class="string">"$1"</span>');

				// Numbers
				result = result.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');

				// Object keys
				result = result.replace(/(\w+):/g, '<span class="key">$1</span>:');

				return result;
			})
			.join('\n');
	}

	function escapeHtml(text: string): string {
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

	:global(.code-block .comment) {
		color: rgb(140 140 140);
		font-style: italic;
	}

	:global(.code-block .keyword) {
		color: oklch(0.476 0.296 265);
		font-weight: 500;
	}

	:global(.code-block .builtin) {
		color: oklch(0.55 0.2 200);
	}

	:global(.code-block .agent) {
		color: oklch(0.5 0.25 150);
		font-weight: 500;
	}

	:global(.code-block .predicate) {
		color: oklch(0.55 0.22 30);
		font-weight: 500;
	}

	:global(.code-block .string) {
		color: oklch(0.5 0.15 145);
	}

	:global(.code-block .number) {
		color: oklch(0.55 0.2 30);
	}

	:global(.code-block .key) {
		color: oklch(0.45 0.15 265);
	}
</style>
