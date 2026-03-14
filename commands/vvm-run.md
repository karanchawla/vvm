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

VVM supports four execution state modes:

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

### SQLite Mode
- Run state written to `.vvm/runs/<run-id>/state.db`
- Subagents write binding rows directly via `sqlite3`
- Full outputs written to local attachments; refs point to attachment paths
- Use for: local SQL inspection and portable single-file state

### Postgres Mode
- Run state written to configured Postgres schema
- Subagents write binding rows directly via `psql`
- Full outputs written to local attachments; refs point to attachment paths
- Use for: team observability and high-parallel workflows

## Flags

| Flag | Description |
|------|-------------|
| `--state=filesystem` | Filesystem artifact-backed state |
| `--state=sqlite` | SQLite-backed run state (`.vvm/runs/<run-id>/state.db`) |
| `--state=postgres` | Postgres-backed run state (`VVM_POSTGRES_URL` required) |
| `--input name="value"` | Provide input values for the program |
| `--offline` | Disable network fetches for remote imports (cache-only mode) |
| `--cache-only` | Alias for `--offline` |

## DB Backend Configuration

Set in `.vvm/.env` or environment:

```env
VVM_STATE_BACKEND=in-context
VVM_POSTGRES_URL=postgresql://user:pass@host:5432/db
VVM_POSTGRES_SCHEMA=vvm
VVM_STATE_ATTACHMENT_THRESHOLD_BYTES=65536
```

Notes:
- `VVM_POSTGRES_URL` is required for `--state=postgres`.
- DB mode credentials are visible to subagents in direct-write mode. Use least-privilege roles.
- Attachments are local-only in this version.

## Registry Shorthand

Programs can import modules using a registry path:

```vvm
from "@alice/research" import deep_research
```

This resolves to `https://vvm.dev/alice/research.vvm` by default (@ stripped, .vvm appended).

**Configure:** Set `VVM_REGISTRY_BASE_URL` in `.vvm/.env` or as an environment variable.

## URL Module Imports

Programs can also import modules from full HTTPS URLs:

```vvm
from "https://raw.githubusercontent.com/example/vvm-libs/main/research.vvm" import deep_research

findings = deep_research("quantum computing")
export findings
```

**Behavior:**
1. Check `.vvm/registry/` for cached copy
2. If `--offline`/`--cache-only` is set:
   - Cache hit: use cached module (including stale entries, with warning)
   - Cache miss: halt with `E095`
3. If online mode and cache is missing or expired (> 1 hour), fetch via HTTPS
4. Cache with content hash for reproducibility
5. Parse and execute as local module

**Security:** Only HTTPS URLs are allowed. HTTP is rejected by default with E092.

**Cache location:** `.vvm/registry/<escaped_url>/<hash>/module.vvm`

## Domain Trust Controls

Configure allowed/blocked domains in `.vvm/.env`:

```env
# Allow only specific domains
VVM_REGISTRY_ALLOWLIST_DOMAINS=vvm.dev,raw.githubusercontent.com

# Or block specific domains
VVM_REGISTRY_DENYLIST_DOMAINS=untrusted-site.com

# Custom registry base URL
VVM_REGISTRY_BASE_URL=https://registry.mycompany.com/
```

Blocked imports produce E091 with `reason="domain_blocked"`.

## Narration Protocol

Use emoji markers to track execution state:

`📍` start | `📦` bind | `✅` success | `❌` error | `🔄` loop | `⏳` waiting | `🎯` decision | `⚡` parallel

If no file specified, search for `.vvm` files and prompt user to select.

## Files to Read

- `skills/vvm/vvm.md` - Complete execution semantics
- `skills/vvm/spec.md` - Language specification
