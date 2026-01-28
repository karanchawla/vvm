---
description: Execute a VVM program
argument-hint: <file.vvm>
---

# VVM Run

Execute a VVM program. You ARE the VVM runtime.

## Execution

1. **Parse & Validate** — Run `/vvm-compile` checks; stop on errors, proceed on warnings
2. **Collect** — Gather agents, functions, skill imports, exports (hoisted)
3. **Execute** — Process statements in source order:
   - `@agent `...`(...)` → Spawn subagent via Task tool, wait for result
   - `?`...`(...)` → Evaluate semantic predicate locally (no spawn)
   - Control flow (if/while/for/match/choose) → Follow program structure
   - Assignments, try/except, raise → Standard execution
4. **Return** — Output exported values as `{ name: value, ... }`

## Rules

- Sequential execution only (no implicit parallelism)
- Track `it` binding through scopes
- Agent calls spawn subagents; predicates evaluate locally
- Two error channels: error values (returned) vs raised errors (abort flow)
- Never execute non-chosen branches in match/choose

## State Modes

VVM supports two execution state modes:

### In-Context Mode (default)
- All state kept in token context
- Agent calls return strings
- No filesystem artifacts
- Use for: quick iteration, small workflows

### Filesystem Mode
- Agent outputs written to `.vvm/runs/<run-id>/bindings/`
- Agent calls return ref values (pointers + summaries)
- Saves tokens for long workflows
- Use for: production runs, long workflows, large outputs

### Flag Usage
- Default: in-context mode
- Override: Run with `--state=filesystem` to enable artifact mode

## Narration Protocol

Use emoji markers to track execution state:

`📍` start | `📦` bind | `✅` success | `❌` error | `🔄` loop | `⏳` waiting | `🎯` decision | `⚡` parallel

If no file specified, search for `.vvm` files and prompt user to select.

## Files to Read

- `skills/vvm/vvm.md` - Complete execution semantics
- `skills/vvm/spec.md` - Language specification
