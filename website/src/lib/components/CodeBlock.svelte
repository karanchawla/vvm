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

<figure class="code-block {className}" aria-label="VVM code example">
	<pre><code>{@html renderTokens(tokenize(code))}</code></pre>
</figure>

<style>
	.code-block {
		background: var(--bg-code);
		border: 1px solid var(--code-border);
		border-radius: 10px;
		overflow: hidden;
		box-shadow: var(--shadow-subtle);
	}

	pre {
		margin: 0;
		padding: 1rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	@media (min-width: 640px) {
		pre {
			padding: 1.5rem;
		}
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.7;
		color: var(--code-text);
		display: block;
		white-space: pre;
	}

	@media (min-width: 640px) {
		code {
			font-size: 0.8125rem;
			line-height: 1.75;
		}
	}

	/* Token styles - using CSS custom properties */
	:global(.tok-comment) {
		color: var(--code-comment);
		font-style: italic;
	}

	:global(.tok-keyword) {
		color: var(--code-keyword);
		font-weight: 500;
	}

	:global(.tok-builtin) {
		color: var(--code-builtin);
		font-weight: 500;
	}

	:global(.tok-agent) {
		color: var(--code-agent);
		font-weight: 600;
	}

	:global(.tok-predicate) {
		color: var(--code-predicate);
		font-weight: 500;
	}

	:global(.tok-string) {
		color: var(--code-string);
	}

	:global(.tok-number) {
		color: var(--code-number);
		font-weight: 500;
	}

	:global(.tok-key) {
		color: var(--code-key);
	}
</style>
