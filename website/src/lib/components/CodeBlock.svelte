<script lang="ts">
	let { code, class: className = '' }: { code: string; class?: string } = $props();

	interface Token {
		type: string;
		value: string;
	}

	// Tokenize VVM code with multi-line string support
	function tokenize(source: string): Token[][] {
		const lines = source.split('\n');
		const result: Token[][] = [];
		let inMultilineString = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const tokens: Token[] = [];

			// If we're continuing a multi-line string
			if (inMultilineString) {
				const closeIndex = line.indexOf('`');
				if (closeIndex !== -1) {
					// String ends on this line
					tokens.push({ type: 'string', value: line.slice(0, closeIndex + 1) });
					inMultilineString = false;
					// Continue tokenizing the rest of the line
					const rest = tokenizeLine(line.slice(closeIndex + 1));
					tokens.push(...rest.tokens);
					if (rest.openString) inMultilineString = true;
				} else {
					// Entire line is part of string
					tokens.push({ type: 'string', value: line });
				}
				result.push(tokens);
				continue;
			}

			// Comment line
			if (line.trim().startsWith('#')) {
				result.push([{ type: 'comment', value: line }]);
				continue;
			}

			// Normal tokenization
			const lineResult = tokenizeLine(line);
			result.push(lineResult.tokens);
			if (lineResult.openString) inMultilineString = true;
		}

		return result;
	}

	function tokenizeLine(line: string): { tokens: Token[]; openString: boolean } {
		const tokens: Token[] = [];
		let remaining = line;
		let openString = false;

		while (remaining.length > 0) {
			// Semantic predicate: ?`...`
			const predicateMatch = remaining.match(/^\?\`([^`]*)\`/);
			if (predicateMatch) {
				tokens.push({ type: 'predicate', value: predicateMatch[0] });
				remaining = remaining.slice(predicateMatch[0].length);
				continue;
			}

			// Agent call: @name
			const agentMatch = remaining.match(/^@(\w+)/);
			if (agentMatch) {
				tokens.push({ type: 'agent', value: agentMatch[0] });
				remaining = remaining.slice(agentMatch[0].length);
				continue;
			}

			// Complete backtick string on same line
			const backtickMatch = remaining.match(/^`([^`]*)`/);
			if (backtickMatch) {
				tokens.push({ type: 'string', value: backtickMatch[0] });
				remaining = remaining.slice(backtickMatch[0].length);
				continue;
			}

			// Unclosed backtick (multi-line string starts)
			const openBacktickMatch = remaining.match(/^`([^`]*)$/);
			if (openBacktickMatch) {
				tokens.push({ type: 'string', value: openBacktickMatch[0] });
				remaining = '';
				openString = true;
				continue;
			}

			// Double-quoted string
			const doubleQuoteMatch = remaining.match(/^"([^"]*)"/);
			if (doubleQuoteMatch) {
				tokens.push({ type: 'string', value: doubleQuoteMatch[0] });
				remaining = remaining.slice(doubleQuoteMatch[0].length);
				continue;
			}

			// Keywords
			const keywordMatch = remaining.match(
				/^(agent|def|match|case|if|elif|else|for|while|in|return|export|require|constrain|refine|try|except|finally|import|from|and|or|not|pass)\b/
			);
			if (keywordMatch) {
				tokens.push({ type: 'keyword', value: keywordMatch[0] });
				remaining = remaining.slice(keywordMatch[0].length);
				continue;
			}

			// Built-in functions
			const builtinMatch = remaining.match(/^(pack|pmap|filter|reduce|map|print)\b/);
			if (builtinMatch) {
				tokens.push({ type: 'builtin', value: builtinMatch[0] });
				remaining = remaining.slice(builtinMatch[0].length);
				continue;
			}

			// Numbers
			const numberMatch = remaining.match(/^\d+/);
			if (numberMatch) {
				tokens.push({ type: 'number', value: numberMatch[0] });
				remaining = remaining.slice(numberMatch[0].length);
				continue;
			}

			// Property/key before colon
			const keyMatch = remaining.match(/^(\w+)(?=\s*:)/);
			if (keyMatch) {
				tokens.push({ type: 'key', value: keyMatch[0] });
				remaining = remaining.slice(keyMatch[0].length);
				continue;
			}

			// Punctuation
			const punctMatch = remaining.match(/^[{}()\[\]:,=]/);
			if (punctMatch) {
				tokens.push({ type: 'punct', value: punctMatch[0] });
				remaining = remaining.slice(punctMatch[0].length);
				continue;
			}

			// Whitespace
			const wsMatch = remaining.match(/^\s+/);
			if (wsMatch) {
				tokens.push({ type: 'ws', value: wsMatch[0] });
				remaining = remaining.slice(wsMatch[0].length);
				continue;
			}

			// Any other character
			tokens.push({ type: 'text', value: remaining[0] });
			remaining = remaining.slice(1);
		}

		return { tokens, openString };
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	function renderTokens(lines: Token[][]): string {
		return lines
			.map((tokens) => {
				if (tokens.length === 0) return '';
				return tokens
					.map((t) => {
						const escaped = escapeHtml(t.value);
						if (t.type === 'text' || t.type === 'ws' || t.type === 'punct') {
							return escaped;
						}
						return `<span class="tok-${t.type}">${escaped}</span>`;
					})
					.join('');
			})
			.join('\n');
	}
</script>

<figure
	class="rounded-xl overflow-hidden shadow-sm bg-gradient-to-b from-surface-code to-surface-secondary dark:from-surface-dark-code dark:to-surface-dark-secondary border border-edge dark:border-edge-dark {className}"
	aria-label="VVM code example"
>
	<pre class="m-0 p-4 sm:p-6 overflow-x-auto"><code class="font-mono text-xs sm:text-sm leading-relaxed sm:leading-7 block whitespace-pre text-syntax-text dark:text-syntax-dark-text">{@html renderTokens(tokenize(code))}</code></pre>
</figure>

<style>
	@reference "../../app.css";

	/* Token styles using Tailwind colors */
	:global(.tok-comment) {
		@apply text-syntax-comment dark:text-syntax-dark-comment italic;
	}

	:global(.tok-keyword) {
		@apply text-syntax-keyword dark:text-syntax-dark-keyword font-medium;
	}

	:global(.tok-builtin) {
		@apply text-syntax-builtin dark:text-syntax-dark-builtin font-medium;
	}

	:global(.tok-agent) {
		@apply text-syntax-agent dark:text-syntax-dark-agent font-semibold;
	}

	:global(.tok-predicate) {
		@apply text-syntax-predicate dark:text-syntax-dark-predicate font-medium;
	}

	:global(.tok-string) {
		@apply text-syntax-string dark:text-syntax-dark-string;
	}

	:global(.tok-number) {
		@apply text-syntax-number dark:text-syntax-dark-number font-medium;
	}

	:global(.tok-key) {
		@apply text-syntax-key dark:text-syntax-dark-key;
	}
</style>
