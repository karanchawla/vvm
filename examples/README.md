# VVM Examples

Progressive examples demonstrating VVM language and orchestration features with runnable programs.

## Getting Started

Run any example:

```bash
/vvm-run examples/01-hello-world.vvm
```

Compile/validate without running:

```bash
/vvm-compile examples/01-hello-world.vvm
```

State mode examples:

```bash
/vvm-run examples/38-rlm-diff-time-machine.vvm --state=filesystem
/vvm-run examples/38-rlm-diff-time-machine.vvm --state=sqlite
/vvm-run examples/38-rlm-diff-time-machine.vvm --state=postgres
```

## Inventory Status

Current runnable examples in this folder: `01-13`, `15-39` (`14` is intentionally unused).

## Core Language and Control Flow

| # | File | Focus |
|---|---|---|
| 01 | [hello-world](01-hello-world.vvm) | Minimal agent definition and call |
| 02 | [simple-agent-call](02-simple-agent-call.vvm) | Input passing and interpolation |
| 03 | [semantic-predicate](03-semantic-predicate.vvm) | `?` semantic predicates |
| 04 | [match-statement](04-match-statement.vvm) | Semantic pattern matching |
| 05 | [if-elif-else](05-if-elif-else.vvm) | Conditional branching |
| 06 | [while-loop](06-while-loop.vvm) | Bounded iteration with `while` |
| 07 | [for-loop](07-for-loop.vvm) | Collection iteration and `range()` |
| 08 | [with-input](08-with-input.vvm) | Scoped implicit input via `it` |
| 09 | [agent-options](09-agent-options.vvm) | `retry`, `timeout`, `backoff`, call naming |
| 10 | [code-council](10-code-council.vvm) | Multi-perspective review council |
| 11 | [parallel-pmap](11-parallel-pmap.vvm) | Parallel map (`pmap`) |
| 12 | [functions](12-functions.vvm) | `def` and reusable composition |
| 13 | [skill-imports](13-skill-imports.vvm) | Skill imports and permissions |
| 15 | [error-values](15-error-values.vvm) | Error values and graceful fallback |
| 16 | [try-except-finally](16-try-except-finally.vvm) | Raised-error control flow |
| 17 | [choose-statement](17-choose-statement.vvm) | AI-routed branching with `choose` |
| 18 | [constrain-require](18-constrain-require.vvm) | Quality gates with `constrain/require` |
| 19 | [refine-loop](19-refine-loop.vvm) | Iterative optimize/evaluate loop |
| 20 | [collection-helpers](20-collection-helpers.vvm) | `map`, `filter`, `reduce`, `pmap` |

## Workflow and Multi-Agent Patterns

| # | File | Focus |
|---|---|---|
| 21 | [devils-advocate](21-devils-advocate.vvm) | Adversarial debate and synthesis |
| 22 | [full-research-pipeline](22-full-research-pipeline.vvm) | End-to-end multi-agent PR review pipeline |
| 23 | [ralph-wiggum-loop](23-ralph-wiggum-loop.vvm) | Autonomous iterative shipping loop |
| 39 | [pr-babysitter](39-pr-babysitter.vvm) | Continuous autonomous PR maintenance until merge |

## Persistent Memory Patterns

| # | File | Focus |
|---|---|---|
| 24 | [agent-memory-basic](24-agent-memory-basic.vvm) | Basic persistent memory lifecycle |
| 25 | [agent-memory-modes](25-agent-memory-modes.vvm) | `continue` vs `dry_run` vs `fresh` |
| 26 | [agent-memory-multi-tenant](26-agent-memory-multi-tenant.vvm) | Per-key isolation and tenancy |
| 27 | [agent-memory-parallel-safe](27-agent-memory-parallel-safe.vvm) | Parallel-safe memory workflow |

## Artifact and Ref-Oriented State

| # | File | Focus |
|---|---|---|
| 28 | [ref-composition](28-ref-composition.vvm) | Ref passing across calls |
| 29 | [ref-loop-accumulation](29-ref-loop-accumulation.vvm) | Ref accumulation in loops |
| 30 | [materializer-pattern](30-materializer-pattern.vvm) | Controlled ref materialization |
| 31 | [run-inspector](31-run-inspector.vvm) | Inspecting run artifacts |

## Flagship Orchestration

| # | File | Focus |
|---|---|---|
| 32 | [ouroboros](32-ouroboros.vvm) | Meta-programming and self-reference |
| 33 | [wisdom-of-crowds](33-wisdom-of-crowds.vvm) | N-of-M parallel voting (`join="any"`) |
| 34 | [hydra](34-hydra.vvm) | Resilient racing (`join="first"`) |
| 35 | [forge](35-forge.vvm) | Parallel work + sequential memory merge |

## Workflow Contracts and Composition

| # | File | Focus |
|---|---|---|
| 36 | [inputs](36-inputs.vvm) | Module `input` declarations + `export` contract |
| 37 | [debate](37-debate.vvm) | Callable module composition (`* as module`) |

## Recursive Language Model

| # | File | Focus |
|---|---|---|
| 38 | [rlm-diff-time-machine](38-rlm-diff-time-machine.vvm) | Recursive git diff archaeology (default `pydantic/pydantic`) |

## Supporting Library Modules

| File | Purpose |
|---|---|
| [lib/position.vvm](lib/position.vvm) | Generates a position for a debate stance |
| [lib/critique.vvm](lib/critique.vvm) | Critiques an argument for composition workflows |

## Contract Semantics (Modules)

For callable modules, VVM derives workflow outputs from `export` declarations:

- `input ...` declares required/optional inputs
- `export name` declares contract output keys
- `from "./x.vvm" import * as mod` and `mod(...)` returns an object keyed by exported names

## Pattern Map

Examples mapped to common agentic patterns:

| Pattern | Examples |
|---|---|
| Augmented LLM | 13 |
| Prompt Chaining | 22 |
| Routing | 04, 17 |
| Parallelization | 11, 20, 33, 34 |
| Orchestrator-Workers | 10, 21, 35 |
| Evaluator-Optimizer | 19 |
| Autonomous Agent | 23 |
| Memory-safe Parallelism | 27, 35 |
| Recursive Decomposition (RLM) | 38 |
| Autonomous PR Operations | 39 |
