<script lang="ts">
	let { code, class: className = '' }: { code: string; class?: string } = $props();

	interface Token {
		type: string;
		value: string;
	}

	// Tokenize VVM code for proper syntax highlighting
	function tokenize(source: string): Token[][] {
		return source.split('\n').map((line) => {
			const tokens: Token[] = [];
			let remaining = line;
			let pos = 0;

			// Comment line
			if (line.trim().startsWith('#')) {
				return [{ type: 'comment', value: line }];
			}

			while (remaining.length > 0) {
				let matched = false;

				// Semantic predicate: ?`...`
				const predicateMatch = remaining.match(/^\?\`([^`]*)\`/);
				if (predicateMatch) {
					tokens.push({ type: 'predicate', value: predicateMatch[0] });
					remaining = remaining.slice(predicateMatch[0].length);
					matched = true;
					continue;
				}

				// Agent call: @name
				const agentMatch = remaining.match(/^@(\w+)/);
				if (agentMatch) {
					tokens.push({ type: 'agent', value: agentMatch[0] });
					remaining = remaining.slice(agentMatch[0].length);
					matched = true;
					continue;
				}

				// Backtick string (can be multiline indicator)
				const backtickMatch = remaining.match(/^`([^`]*)`/);
				if (backtickMatch) {
					tokens.push({ type: 'string', value: backtickMatch[0] });
					remaining = remaining.slice(backtickMatch[0].length);
					matched = true;
					continue;
				}

				// Unclosed backtick (continues to next line)
				const openBacktickMatch = remaining.match(/^`([^`]*)$/);
				if (openBacktickMatch) {
					tokens.push({ type: 'string', value: openBacktickMatch[0] });
					remaining = '';
					matched = true;
					continue;
				}

				// Double-quoted string
				const doubleQuoteMatch = remaining.match(/^"([^"]*)"/);
				if (doubleQuoteMatch) {
					tokens.push({ type: 'string', value: doubleQuoteMatch[0] });
					remaining = remaining.slice(doubleQuoteMatch[0].length);
					matched = true;
					continue;
				}

				// Keywords
				const keywordMatch = remaining.match(
					/^(agent|def|match|case|if|elif|else|for|while|in|return|export|require|constrain|refine|try|except|finally|import|from|and|or|not|pass)\b/
				);
				if (keywordMatch) {
					tokens.push({ type: 'keyword', value: keywordMatch[0] });
					remaining = remaining.slice(keywordMatch[0].length);
					matched = true;
					continue;
				}

				// Built-in functions
				const builtinMatch = remaining.match(/^(pack|pmap|filter|reduce|map|print)\b/);
				if (builtinMatch) {
					tokens.push({ type: 'builtin', value: builtinMatch[0] });
					remaining = remaining.slice(builtinMatch[0].length);
					matched = true;
					continue;
				}

				// Numbers
				const numberMatch = remaining.match(/^\d+/);
				if (numberMatch) {
					tokens.push({ type: 'number', value: numberMatch[0] });
					remaining = remaining.slice(numberMatch[0].length);
					matched = true;
					continue;
				}

				// Property/key before colon (but not in strings)
				const keyMatch = remaining.match(/^(\w+)(?=\s*:)/);
				if (keyMatch) {
					tokens.push({ type: 'key', value: keyMatch[0] });
					remaining = remaining.slice(keyMatch[0].length);
					matched = true;
					continue;
				}

				// Punctuation
				const punctMatch = remaining.match(/^[{}()\[\]:,=]/);
				if (punctMatch) {
					tokens.push({ type: 'punct', value: punctMatch[0] });
					remaining = remaining.slice(punctMatch[0].length);
					matched = true;
					continue;
				}

				// Whitespace
				const wsMatch = remaining.match(/^\s+/);
				if (wsMatch) {
					tokens.push({ type: 'ws', value: wsMatch[0] });
					remaining = remaining.slice(wsMatch[0].length);
					matched = true;
					continue;
				}

				// Any other character
				if (!matched) {
					tokens.push({ type: 'text', value: remaining[0] });
					remaining = remaining.slice(1);
				}
			}

			return tokens;
		});
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

	$effect(() => {
		// Reactive tokenization when code changes
	});
</script>

<div class="code-block {className}">
	<pre><code>{@html renderTokens(tokenize(code))}</code></pre>
</div>

<style>
	.code-block {
		background: linear-gradient(to bottom, rgb(252 252 253), rgb(248 248 250));
		border: 1px solid rgb(232 232 237);
		border-radius: 10px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.04);
	}

	pre {
		margin: 0;
		padding: 1.5rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	code {
		font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.8125rem;
		line-height: 1.75;
		color: rgb(55 55 60);
		display: block;
		white-space: pre;
		font-feature-settings: 'liga' 1, 'calt' 1;
	}

	/* Token styles - carefully crafted color palette */
	:global(.tok-comment) {
		color: rgb(142 142 152);
		font-style: italic;
	}

	:global(.tok-keyword) {
		color: rgb(168 70 185);
		font-weight: 550;
	}

	:global(.tok-builtin) {
		color: rgb(50 130 180);
		font-weight: 500;
	}

	:global(.tok-agent) {
		color: rgb(30 130 90);
		font-weight: 600;
	}

	:global(.tok-predicate) {
		color: rgb(195 90 50);
		font-weight: 550;
	}

	:global(.tok-string) {
		color: rgb(65 130 70);
	}

	:global(.tok-number) {
		color: rgb(28 100 180);
		font-weight: 500;
	}

	:global(.tok-key) {
		color: rgb(130 90 165);
	}
</style>
