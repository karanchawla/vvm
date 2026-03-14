---
description: Inspect a VVM run from filesystem, SQLite, or Postgres state
argument-hint: <run-id>
---

# VVM Run Inspect

Inspect a prior VVM run without executing the program again.

## Usage

```bash
/vvm-run-inspect 20260127-143052-a7f3b2
```

## Backend Selection

Inspection backend resolution:
1. `--state=<filesystem|sqlite|postgres>` (if provided)
2. `VVM_STATE_BACKEND` from `.vvm/.env` or env
3. `filesystem` fallback for inspect

## Flags

| Flag | Description |
|------|-------------|
| `--state=filesystem` | Inspect `.vvm/runs/<run-id>/state.md` and bindings directory |
| `--state=sqlite` | Inspect `.vvm/runs/<run-id>/state.db` via `sqlite3` |
| `--state=postgres` | Inspect Postgres run tables via `psql` |

## What to Show

Always summarize:
1. Run metadata: status, started/updated timestamps, state mode
2. Execution summary: total statements, completed, failed, cancelled
3. Binding summary: names, size, mime, attachment path
4. Failure list: statement index/text + error details

## Backend-Specific Recipes

### Filesystem

Read:
- `.vvm/runs/<run-id>/state.md`
- `.vvm/runs/<run-id>/attachments/` (if present)

### SQLite

Run queries like:

```bash
sqlite3 -header -column ".vvm/runs/<run-id>/state.db" "SELECT id, status, started_at, updated_at FROM run;"
sqlite3 -header -column ".vvm/runs/<run-id>/state.db" "SELECT statement_index, status, error_message FROM execution ORDER BY id;"
sqlite3 -header -column ".vvm/runs/<run-id>/state.db" "SELECT name, execution_id, summary, bytes, attachment_path FROM bindings ORDER BY updated_at;"
```

### Postgres

Run queries like:

```bash
psql "$VVM_POSTGRES_URL" -c "SELECT id, status, started_at, updated_at FROM vvm.run WHERE id = '<run-id>';"
psql "$VVM_POSTGRES_URL" -c "SELECT statement_index, status, error_message FROM vvm.execution WHERE run_id = '<run-id>' ORDER BY id;"
psql "$VVM_POSTGRES_URL" -c "SELECT name, execution_id, summary, bytes, attachment_path FROM vvm.bindings WHERE run_id = '<run-id>' ORDER BY updated_at;"
```

## Common Errors

- `E096`: unknown/unsupported backend
- `E097`: sqlite backend unavailable
- `E098`: postgres backend unavailable
- `E099`: state backend read failure

## Files to Read

- `skills/vvm/vvm.md` - state backend semantics and inspectability rules
- `skills/vvm/spec.md` - backend diagnostics and runtime error kinds
