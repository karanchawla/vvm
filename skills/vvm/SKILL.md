---
name: vvm
description: |
  VVM (Vibe Virtual Machine) is a language for agentic programs where the LLM is the runtime.

  Activate when: running .vvm files, mentioning VVM, calling /vvm-boot, /vvm-run, /vvm-compile,
  /vvm-generate, or orchestrating multi-agent workflows. Read spec.md for the language specification
  and vvm.md for execution semantics.
---

# VVM Skill

VVM (Vibe Virtual Machine) is a language for writing agentic programs where the LLM acts as the runtime.

---

## When to Activate

Activate this skill when:

1. User runs `/vvm-boot`, `/vvm-compile`, `/vvm-run`, or `/vvm-generate`
2. User opens or references a `.vvm` file
3. User asks about VVM syntax, semantics, or patterns
4. User wants to create an AI-powered workflow

---

## Documentation Files

| File              | Role                      | When to Read                    |
| ----------------- | ------------------------- | ------------------------------- |
| `SKILL.md`        | Quick reference, triggers | Always first                    |
| `vvm.md`          | Execution semantics       | When running programs           |
| `spec.md`         | Language specification    | For syntax/validation questions |
| `memory-spec.md`  | Agent memory (portable)   | When using persistent agents    |
| `patterns.md`     | Design patterns           | When writing programs           |
| `antipatterns.md` | Anti-patterns             | When reviewing programs         |

---

## Quick Reference

### Agent Definition

```vvm
agent researcher(
  model="sonnet",
  prompt="thorough, cite sources",
  skills=["web-search"],
  permissions=perm(network="allow", bash="deny"),
)
```

### Agent Call

```vvm
result = @researcher `Find papers on {topic}.`(topic)
result = @researcher `Summarize.`(topic, retry=3, timeout="30s")
```

### Agent Memory

```vvm
agent assistant(model="sonnet", prompt="Helpful.", memory={ scope: "project", key: "user:alice" })
reply = @assistant `Continue.`(request)  # default: memory_mode="continue"
dry = @assistant `Read-only run.`(request, memory_mode="dry_run")
fresh = @assistant `Stateless run.`(request, memory_mode="fresh")
```

### Semantic Predicate

```vvm
ready = ?`production ready`(code)

if ?`needs more work`(draft):
  draft = @writer `Improve.`(draft)
```

### Pattern Matching

```vvm
match result:
  case ?`high quality`:
    publish(result)
  case error(kind="timeout"):
    result = @backup `Retry.`(request)
  case error(_):
    log_error(result)
  case _:
    pass
```

### Choice

```vvm
choose analysis by ?`best approach` as choice:
  option "quick":
    plan = @planner `Minimal plan.`()
  option "thorough":
    plan = @planner `Full plan.`()
```

### Control Flow

```vvm
# If/elif/else
if condition:
  do_something()
elif other:
  do_other()
else:
  do_default()

# While loop
while not ?`done`(result):
  result = @worker `Improve.`(result)

# For loop
for item in items:
  process(item)
```

### Context Passing

```vvm
# Implicit input (it)
with input data:
  result = @agent `Process.`()  # uses it == data

# Explicit input
result = @agent `Process.`(data)
```

### Functions

```vvm
def analyze(topic):
  research = @researcher `Find info on {topic}.`(topic)
  return @analyst `Analyze.`(research)

result = analyze("AI safety")
```

### Error Handling

```vvm
# Error values (match)
match result:
  case error(_):
    handle_error(result)

# Raised errors (try/except)
try:
  if ?`invalid`(input):
    raise "Invalid input"
except as err:
  log(err)
finally:
  cleanup()
```

### Constraints

```vvm
draft = @writer `Write report.`(data)

constrain draft(attempts=3):
  require ?`has citations`
  require ?`no hallucinations`
```

### Imports/Exports

```vvm
# Skill imports
import "web-search" from "github:anthropic/skills"

# Module imports
from "./lib/research.vvm" import deep_research
from "./lib/agents.vvm" import @researcher

# Exports
export result
export @researcher
```

### Standard Library

```vvm
# Parallel map
results = pmap(items, process)

# Sequential map/filter/reduce
mapped = map(items, transform)
filtered = filter(items, predicate)
def add(a, b):
  return a + b
total = reduce(items, add, init=0)

# Iterative refinement
final = refine(initial, max=5, done=is_ready, step=improve)

# Named fan-in
ctx = pack(research, analysis, topic=topic)

# Range
for i in range(10):
  process(i)
```

---

## Examples

| #   | Name                   | Concepts                |
| --- | ---------------------- | ----------------------- |
| 01  | hello-world            | Minimal program         |
| 02  | simple-agent-call      | Agent with input        |
| 03  | semantic-predicate     | `?` predicates          |
| 04  | match-statement        | Pattern matching        |
| 05  | if-elif-else           | Conditionals            |
| 06  | while-loop             | While loops             |
| 07  | for-loop               | For loops               |
| 08  | with-input             | Context passing         |
| 09  | agent-options          | retry, timeout, backoff |
| 10  | derived-agents         | .with() and inline      |
| 11  | parallel-pmap          | Parallel execution      |
| 12  | functions              | def and return          |
| 13  | skill-imports          | Skill imports           |
| 14  | module-imports         | Module imports          |
| 15  | error-values           | Error value matching    |
| 16  | try-except-finally     | Raised errors           |
| 17  | choose-statement       | AI-selected branching   |
| 18  | constrain-require      | Quality constraints     |
| 19  | refine-loop            | Iterative improvement   |
| 20  | collection-helpers     | map, filter, reduce     |
| 21  | pack-helper            | Named fan-in            |
| 22  | full-research-pipeline | Complex workflow        |
| 23  | ralph-wiggum-loop      | Continuous improvement  |
| 24  | agent-memory-basic     | Memory binding + digest/ledger |
| 25  | agent-memory-modes     | memory_mode: continue/dry_run/fresh |
| 26  | agent-memory-multi-tenant | Per-key isolation |
| 27  | agent-memory-parallel-safe | pmap-safe persistence |
| 28  | agent-memory-escape-room | Demo: persistent game state |

---

## Commands

### /vvm-boot

Initialize VVM for new or returning users. Detects existing files and provides onboarding.

### /vvm-compile <file.vvm>

Validate a VVM program without executing. Reports errors and warnings with line numbers.

### /vvm-run <file.vvm>

Execute a VVM program. You become the VVM runtime and execute statements sequentially, spawning subagents for agent calls.

### /vvm-generate <description>

Generate a VVM program from a natural language description. Analyzes intent, maps to VVM constructs, applies best practices, and produces well-structured code. Asks clarifying questions if the request is ambiguous.

---

## Key Principles

1. **Minimal syntax** - Familiar indentation-based blocks
2. **Explicit AI boundary** - Agent calls are syntactically distinct (`@agent`)
3. **Eager execution** - No lazy evaluation, sequential by default
4. **Semantic control flow** - Branch on meaning, not just booleans
5. **Two error channels** - Values (match) vs raised (try/except)
6. **Explicit parallelism** - Only `pmap` runs concurrently
