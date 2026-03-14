---
description: Validate and compile a VVM program
argument-hint: <file.vvm>
---

# VVM Compile

Validate a VVM program without executing it. This is static analysis only.

## Phases

1. **Parse** — Tokenize and build AST per grammar (E001-E005)
2. **Load Imports** — Resolve `from "path" import ...`, check files exist (E090, E032)
3. **Collect Declarations** — Gather agents, functions, skill imports, inputs, and exports/output-contract keys (E010-E031, E110-E114)
4. **Validate References** — Check `@agent` refs, `{placeholders}`, variables, and statically-known module output property access (E040-E052, E114)
5. **Validate Control Flow** — Check return/break/continue/try structure (E050-E082)
6. **Warnings** — Non-blocking issues like unused variables and contract hygiene checks (W001-W051)

## Output

**Success:**
```
✅ <file.vvm> is valid

Contract:
  Inputs:
    topic (required): "The topic to research"
    depth (optional = "medium"): "Research depth"

  Outputs:
    report
    summary

Agents: <count>
Functions: <count>
```

**Error:**
```
❌ Validation failed

E0XX line N col C: description
  <source line>
  ^
```

If no file specified, search for `.vvm` files and prompt user to select.

## Flags

| Flag | Description |
|------|-------------|
| `--offline` | Disable network fetches for remote imports (cache-only mode) |
| `--cache-only` | Alias for `--offline` |

## Contract Display

When compilation succeeds, the contract shows what inputs the module requires and what outputs it produces. In VVM, outputs are derived from `export` declarations. This allows you to inspect a workflow's requirements before running it.

For remote modules, fetch and cache first, then display the contract:

```bash
/vvm-compile "@alice/research"
/vvm-compile "https://example.com/research.vvm"
```

Same output — the contract is extracted from the parsed module.

For a dedicated registry discovery view (contract + cache metadata), use:

```bash
/vvm-registry-inspect "@alice/research"
```

## Remote Compile Behavior

For URL/registry imports, `/vvm-compile` uses the same resolver, cache, trust controls, and integrity checks as runtime module loading.

1. Resolve source (`@handle/slug` or `https://...`) to a URL.
2. If `--offline`/`--cache-only` is set:
   - Cache hit: compile from cache
   - Cache miss: fail with `E095`
3. If online mode and cache is missing/expired, fetch and cache first.
4. Parse module and extract contract without executing top-level statements or spawning agents.

## Files to Read

- `skills/vvm/spec.md` - Complete grammar and error definitions (Section 16)
- `skills/vvm/vvm.md` - Contract extraction algorithm (Section 4.4.3)
