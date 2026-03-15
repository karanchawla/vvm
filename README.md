# VVM

**Vibe Virtual Machine** is a DSL for agentic workflows where the LLM is the runtime.

VVM gives you:
- explicit agent boundaries (`@agent ...`)
- semantic control flow (`?`, `match`, `choose`)
- explicit concurrency (`pmap`, `parallel(join=..., on_fail=...)`)
- reusable workflow contracts (`input`, `export`, callable modules)
- scalable state backends (`in-context`, `filesystem`, `sqlite`, `postgres`)

The language spec is in [skills/vvm/spec.md](skills/vvm/spec.md) (v`0.0.4`).

## Quick Start

Install as a Claude Code plugin:

```bash
claude plugin marketplace add https://github.com/karanchawla/vvm.git
claude plugin install vvm@vvm
```

Then:

```bash
/vvm-boot
/vvm-compile examples/01-hello-world.vvm
/vvm-run examples/01-hello-world.vvm
```

For scalable runs:

```bash
/vvm-run examples/39-pr-babysitter.vvm --state=filesystem
/vvm-run examples/38-rlm-diff-time-machine.vvm --state=sqlite
```

## Minimal Example

```vvm
input topic: "Topic to research"

agent researcher(model="sonnet", prompt="Research expert.")
agent writer(model="sonnet", prompt="Clear technical writer.")

research = @researcher `Research {topic} and cite evidence.`(topic)
report = @writer `Write an executive summary.`(research)

export report
```

## Command Surface

| Command | Purpose |
|---|---|
| `/vvm-boot` | Initialize and guide first workflow |
| `/vvm-compile <file.vvm>` | Parse/validate without executing |
| `/vvm-run <file.vvm>` | Execute workflow |
| `/vvm-run-inspect <run-id>` | Inspect run state (filesystem/sqlite/postgres) |
| `/vvm-registry-inspect <source>` | Inspect remote workflow contract + cache metadata |
| `/vvm-generate <description>` | Generate VVM from natural language |

See command docs in [commands/](commands).

## State Backends

| Mode | Return Type | Best For |
|---|---|---|
| `in-context` | strings | quick local iteration |
| `filesystem` | ref values | long runs, artifact debugging |
| `sqlite` | ref values | local SQL-inspectable state |
| `postgres` | ref values | team observability, high concurrency |

Backends are selected with `--state=...` on `/vvm-run`.

## Remote Modules and Registry

VVM supports:
- local modules: `from "./lib/x.vvm" import ...`
- URL modules: `from "https://..." import ...`
- registry shorthand: `from "@handle/slug" import ...`

Use:
- `--offline` / `--cache-only` for cache-only resolution
- `/vvm-registry-inspect` to inspect contracts before execution

## Examples

Examples are in [examples/](examples), with an up-to-date index in [examples/README.md](examples/README.md).

Current catalog includes:
- fundamentals (`01-13`, `15-20`)
- multi-agent orchestration (`21-23`, `32-35`, `39`)
- memory and ref/state patterns (`24-31`)
- workflow contracts/modules (`36-37`)
- recursive language model pattern (`38`)

## Repository Layout

| Path | Purpose |
|---|---|
| [skills/vvm/spec.md](skills/vvm/spec.md) | Normative language spec |
| [skills/vvm/vvm.md](skills/vvm/vvm.md) | Runtime/execution semantics |
| [skills/vvm/patterns.md](skills/vvm/patterns.md) | Recommended design patterns |
| [skills/vvm/antipatterns.md](skills/vvm/antipatterns.md) | Common pitfalls |
| [commands/](commands) | Slash-command behavior docs |
| [examples/](examples) | Runnable reference workflows |
| [design/](design) | Feature-gap and implementation planning docs |

## Status and Safety

VVM is still evolving. Validate with `/vvm-compile` before running large workflows, and run high-impact automations with tight permissions and review gates.

## License

[MIT](LICENSE)
