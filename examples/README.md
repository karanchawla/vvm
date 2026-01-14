# VVM Examples

Progressive examples demonstrating VVM language features through real-world scenarios.

## Getting Started

Run any example with:
```
/vvm-run examples/01-hello-world.vvm
```

Validate without running:
```
/vvm-compile examples/01-hello-world.vvm
```

## Examples by Category

### Basics (01-08)

| # | Example | Scenario | Concepts |
|---|---------|----------|----------|
| 01 | [hello-world](01-hello-world.vvm) | Commit message generator | Agent definition, basic call |
| 02 | [simple-agent-call](02-simple-agent-call.vvm) | Explain Like I'm 5 | Input passing, interpolation |
| 03 | [semantic-predicate](03-semantic-predicate.vvm) | Spam detector | `?` predicates, boolean ops |
| 04 | [match-statement](04-match-statement.vvm) | Support ticket router | Pattern matching |
| 05 | [if-elif-else](05-if-elif-else.vvm) | Content moderator | Conditional branching |
| 06 | [while-loop](06-while-loop.vvm) | Tweet shortener | While loops, iteration bounds |
| 07 | [for-loop](07-for-loop.vvm) | Receipt summarizer | For loops, range() |
| 08 | [with-input](08-with-input.vvm) | Contract analyzer | Context passing with `it` |

### Intermediate (09-15)

| # | Example | Scenario | Concepts |
|---|---------|----------|----------|
| 09 | [agent-options](09-agent-options.vvm) | Flaky API caller | retry, timeout, backoff |
| 10 | [derived-agents](10-derived-agents.vvm) | Tone adapters | .with() and inline agents |
| 11 | [parallel-pmap](11-parallel-pmap.vvm) | Multi-language translator | Parallel execution |
| 12 | [functions](12-functions.vvm) | Email processor | def and return |
| 13 | [skill-imports](13-skill-imports.vvm) | Fact checker | Skills, permissions |
| 14 | [module-imports](14-module-imports.vvm) | Team config | Importing modules |
| 15 | [error-values](15-error-values.vvm) | Payment failover | Error matching, fallbacks |

### Advanced (16-23)

| # | Example | Scenario | Concepts | Agent Pattern |
|---|---------|----------|----------|---------------|
| 16 | [try-except-finally](16-try-except-finally.vvm) | Database transactions | Exception handling | - |
| 17 | [choose-statement](17-choose-statement.vvm) | Customer router | AI-selected branching | Routing |
| 18 | [constrain-require](18-constrain-require.vvm) | Press release gate | Quality constraints | - |
| 19 | [refine-loop](19-refine-loop.vvm) | Code review bot | Iterative improvement | Evaluator-Optimizer |
| 20 | [collection-helpers](20-collection-helpers.vvm) | Sentiment analyzer | map, filter, reduce, voting | Parallelization |
| 21 | [pack-helper](21-pack-helper.vvm) | RPG character creator | Fan-in synthesis | Orchestrator-Workers |
| 22 | [full-pipeline](22-full-research-pipeline.vvm) | PR review pipeline | Multi-agent workflow | Prompt Chaining |
| 23 | [ralph-wiggum-loop](23-ralph-wiggum-loop.vvm) | Ship the feature | Continuous improvement | Autonomous Agent |

## Agent Patterns

These examples demonstrate the agent patterns from [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents):

| Pattern | Example | Description |
|---------|---------|-------------|
| **Augmented LLM** | 13 | Base building block with skills/tools |
| **Prompt Chaining** | 22 | Sequential steps, output→input |
| **Routing** | 04, 17 | Classify and direct to handlers |
| **Parallelization** | 11, 20 | Concurrent execution, voting |
| **Orchestrator-Workers** | 21 | Dynamic task delegation |
| **Evaluator-Optimizer** | 19 | Generate→evaluate→refine loop |
| **Autonomous Agent** | 23 | Full autonomy (Ralph Wiggum Loop) |

## Key Syntax

```vvm
# Agent definition
agent name(model="sonnet", prompt="...")

# Agent call
result = @agent `template with {variable}`(input)

# Semantic predicate
if ?`criteria`(value):

# Pattern matching
match value:
  case ?`pattern`: ...
  case _: ...

# AI-selected branching
choose value by ?`criteria` as choice:
  option "name": ...

# Quality constraints
constrain output():
  require ?`condition`

# Parallel execution
results = pmap(items, func)

# Iterative refinement
final = refine(initial, max=5, done=check, step=improve)
```
