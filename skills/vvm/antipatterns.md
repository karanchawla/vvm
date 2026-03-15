---
role: antipatterns
summary: |
  Common mistakes and anti-patterns to avoid when writing VVM programs.
see-also:
  - patterns.md: Design patterns (what TO do)
  - spec.md: Language specification
  - vvm.md: Execution semantics
---

# VVM Anti-Patterns

This document describes common mistakes and anti-patterns to avoid when writing VVM programs.

---

## Structural Anti-Patterns

### God Agent

**Problem:** A single agent definition that tries to do everything.

```vvm
# Bad: One agent handles all tasks
agent universal(
  model="opus",
  prompt="You are an expert at everything: research, writing, coding, analysis, design..."
)

research = @universal `Research AI.`(())
code = @universal `Write Python code.`(spec)
review = @universal `Review the code.`(code)
```

**Why it's bad:**
- Prompts become unfocused
- Hard to tune for specific tasks
- Expensive model used even for simple tasks

**Solution:** Use specialized agents (see Agent Specialization pattern).

```vvm
# Good: Specialized agents
agent researcher(model="sonnet", prompt="Research expert")
agent coder(model="sonnet", prompt="Python developer")
agent reviewer(model="sonnet", prompt="Code reviewer")
```

---

### Context Explosion

**Problem:** Passing everything to every agent call.

```vvm
# Bad: Passing entire accumulated context everywhere
all_data = pack(research, analysis, code, tests, docs, config, history)
result = @agent `Do something.`(all_data)
next = @agent `Do next thing.`(pack(all_data, result))
```

**Why it's bad:**
- Wastes tokens/budget
- Confuses agents with irrelevant context
- Slows down responses

**Solution:** Pass only what's needed.

```vvm
# Good: Pass relevant context only
result = @agent `Analyze the research.`(research)
next = @agent `Build on analysis.`(result)
```

---

### Implicit Dependency

**Problem:** Over-relying on `it` makes data flow unclear.

```vvm
# Bad: Too much implicit context
with input data:
  with input @agent `Process.`():
    with input @agent `Transform.`():
      with input @agent `Finalize.`():
        result = @agent `Complete.`()
```

**Why it's bad:**
- Hard to trace data flow
- Easy to lose track of what `it` is
- Debugging is difficult

**Solution:** Use explicit input for complex flows.

```vvm
# Good: Explicit data flow
processed = @agent `Process.`(data)
transformed = @agent `Transform.`(processed)
finalized = @agent `Finalize.`(transformed)
result = @agent `Complete.`(finalized)
```

---

### Spaghetti Matching

**Problem:** Deeply nested match statements.

```vvm
# Bad: Nested matches
match result1:
  case ?`condition1`:
    match result2:
      case ?`condition2`:
        match result3:
          case ?`condition3`:
            do_something()
```

**Why it's bad:**
- Hard to read and maintain
- Easy to miss cases
- Difficult to test

**Solution:** Flatten with early returns or separate functions.

```vvm
# Good: Flat structure
if not ?`condition1`(result1):
  handle_not_condition1()
  return

if not ?`condition2`(result2):
  handle_not_condition2()
  return

if ?`condition3`(result3):
  do_something()
```

---

## Cost/Performance Anti-Patterns

### Model Inflation

**Problem:** Using expensive models for simple tasks.

```vvm
# Bad: Opus for everything
agent formatter(model="opus", prompt="Format this text")
agent validator(model="opus", prompt="Check for typos")
agent counter(model="opus", prompt="Count the words")
```

**Why it's bad:**
- Wasted budget
- Slower responses
- No quality improvement for simple tasks

**Solution:** Match model to task complexity.

```vvm
# Good: Right model for the job
agent formatter(model="haiku", prompt="Format this text")
agent validator(model="haiku", prompt="Check for typos")
agent synthesizer(model="opus", prompt="Complex synthesis")
```

---

### Unbounded Loops

**Problem:** Loops without termination guarantees.

```vvm
# Bad: No maximum iterations
while not ?`perfect`(result):
  result = @improver `Keep improving.`(result)
  # Could run forever!
```

**Why it's bad:**
- Could run indefinitely
- Unpredictable cost
- No timeout protection

**Solution:** Use `refine` with max iterations or add counters.

```vvm
# Good: Bounded iteration
def is_done(result, i):
  return ?`good enough`(result) or i >= 10

final = refine(initial, max=10, done=is_done, step=improve)
```

---

### Redundant Computation

**Problem:** Repeating expensive operations.

```vvm
# Bad: Same research done multiple times
report1 = @writer `Write about AI.`(@researcher `Research AI.`(()))
report2 = @writer `Another view on AI.`(@researcher `Research AI.`(()))
```

**Why it's bad:**
- Wasted tokens and time
- Inconsistent results between calls
- Unnecessary cost

**Solution:** Cache and reuse results.

```vvm
# Good: Research once, reuse
research = @researcher `Research AI.`(())
report1 = @writer `Write about AI.`(research)
report2 = @writer `Another view on AI.`(research)
```

---

### Sequential When Parallel

**Problem:** Running independent tasks sequentially.

```vvm
# Bad: Sequential independent work
result1 = @agent `Task 1.`(data)
result2 = @agent `Task 2.`(data)
result3 = @agent `Task 3.`(data)
# Total time: T1 + T2 + T3
```

**Why it's bad:**
- Wasted time
- Poor user experience
- Underutilizes available concurrency

**Solution:** Use `pmap` for independent work.

```vvm
# Good: Parallel execution
def process(task):
  return @agent `{task}`(data)

results = pmap(["Task 1", "Task 2", "Task 3"], process)
# Total time: max(T1, T2, T3)
```

---

### Large Artifact Workflow in In-Context Mode

**Problem:** Running long, high-output workflows in in-context mode and expecting stable scaling.

```vvm
# Bad: Multiple heavy outputs chained in in-context mode
research = @researcher `Deep research on {topic}.`(topic)
analysis = @analyst `Analyze deeply.`(research)
report = @writer `Long comprehensive report.`(analysis)
```

**Why it's bad:**
- Context growth compounds across stages
- Token usage and latency spike unpredictably
- Failures are harder to inspect post-hoc

**Solution:** Use artifact-backed state modes (`filesystem`, `sqlite`, or `postgres`) for large or long-running workloads.

```vvm
# Good: Same code, but run in artifact-backed mode:
# /vvm-run program.vvm --state=filesystem
# /vvm-run program.vvm --state=sqlite
# /vvm-run program.vvm --state=postgres
```

---

## Parallel Block Anti-Patterns

These anti-patterns apply specifically to `parallel()` blocks.

### Shared Memory Key Under `parallel`

**Problem:** Parallel branches share the same memory key and try to write concurrently.

```vvm
agent helper(model="sonnet", memory={ scope: "project", key: "shared" })

# Bad: All branches compete for the same memory lock
parallel() as results:
  a = @helper `Task A.`(x)  # Tries to acquire lock
  b = @helper `Task B.`(y)  # Blocked waiting for lock
  c = @helper `Task C.`(z)  # Blocked waiting for lock
```

**Why it's bad:**
- Causes lock contention (or `error(kind="locked")`)
- Serializes parallel work (defeating the purpose)
- Memory evolution depends on scheduling order

**Solution:** Use `memory_mode="fresh"` for parallel workers, then merge sequentially.

```vvm
# Good: Each branch runs stateless; merge step updates memory
parallel() as results:
  a = @helper `Task A.`(x, memory_mode="fresh")
  b = @helper `Task B.`(y, memory_mode="fresh")
  c = @helper `Task C.`(z, memory_mode="fresh")

summary = @helper `Merge results.`(results)  # Single writer
```

---

### Assuming All Branches Complete

**Problem:** Code assumes all branches finished when using `join="any"` or `join="first"`.

```vvm
# Bad: Assumes all branches completed
parallel(join="any", count=2) as results:
  a = @fast `Quick.`(x)
  b = @medium `Medium.`(x)
  c = @slow `Slow.`(x)

# Accessing cancelled branch raises an error or returns undefined
process(results.a)
process(results.b)
process(results.c)  # May not exist!
```

**Why it's bad:**
- With `join="any"`, only `count` branches complete
- With `join="first"`, only one branch completes
- Accessing cancelled branches fails or returns error values

**Solution:** Check `_completed` or `_winner` before accessing branches.

```vvm
# Good: Only access completed branches
parallel(join="any", count=2) as results:
  a = @fast `Quick.`(x)
  b = @medium `Medium.`(x)
  c = @slow `Slow.`(x)

for name in results._completed:
  process(results[name])
```

---

### Dependencies Between Parallel Branches

**Problem:** Parallel branches that depend on each other's results.

```vvm
# Bad: Branch b depends on branch a
parallel() as results:
  a = @fetcher `Get data.`(source)
  b = @analyzer `Analyze.`(a)  # WRONG: 'a' doesn't exist yet!
```

**Why it's bad:**
- Branches are evaluated before spawning, but values aren't available
- Creates undefined behavior or errors
- Defeats the purpose of parallelism

**Solution:** Use sequential steps for dependencies, parallel for independent work.

```vvm
# Good: Sequential for dependencies, parallel for independent
data = @fetcher `Get data.`(source)

parallel() as results:
  analysis = @analyst `Analyze data.`(data)
  summary = @summarizer `Summarize data.`(data)
  visual = @visualizer `Visualize data.`(data)
```

---

### Single Branch Parallel

**Problem:** Using `parallel` with only one branch.

```vvm
# Bad: Single branch parallel (no benefit)
parallel(join="first") as result:
  answer = @solver `Solve problem.`(problem)
```

**Why it's bad:**
- No parallelism benefit
- Adds overhead and complexity
- `join="first"` with one branch is meaningless

**Solution:** Use direct agent call for single tasks.

```vvm
# Good: Direct call
answer = @solver `Solve problem.`(problem)
```

Note: VVM emits warning W041 for this anti-pattern.

---

## Reliability Anti-Patterns

### Transcript Stuffing into Memory

**Problem:** Prompting a persistent agent to store full transcripts (or large artifacts) in memory.

```vvm
# Bad: Encourages unbounded, low-signal memory writes
agent assistant(
  model="sonnet",
  prompt="After every reply, append the full conversation to memory.",
  memory={ scope: "project", key: "user:alice" },
)

reply = @assistant `Help me debug this.`(issue)
```

**Why it's bad:**
- Bloats the injected context on every call (cost + confusion)
- Increases risk of persisting sensitive data
- Produces memory that’s hard to compaction/edit

**Solution:** Use digest as a compact working set, and retain only short narrative facts.

```vvm
# Good: Explicit, bounded memory updates
agent assistant(
  model="sonnet",
  prompt="Use vvm-memory patches to maintain a small digest + short retain facts. Never store secrets.",
  memory={ scope: "project", key: "user:alice" },
)
```

---

### Persisting Secrets

**Problem:** Treating agent memory as a credential store.

```vvm
# Bad: Encourages persisting secrets
agent deployer(
  model="sonnet",
  prompt="Remember any API keys or tokens you see so you can reuse them later.",
  memory={ scope: "project", key: "deploy" },
)
```

**Why it's bad:**
- Secrets leak into inspectable files (`digest.md`, `ledger.jsonl`)
- Increases blast radius (shared keys, backups, logs)
- Violates “safety by default” and complicates audits

**Solution:** Keep secrets out of memory; use env vars/secret stores, and prefer stateless calls when handling credentials.

```vvm
# Good: Treat secret handling as ephemeral
agent deployer(
  model="sonnet",
  prompt="Never store secrets in memory. Ask to use env vars or a secret manager.",
  memory={ scope: "project", key: "deploy" },
)

dry = @deployer `Describe the deployment steps without storing any credentials.`(req, memory_mode="fresh")
```

---

### Shared Memory Key Under `pmap`

**Problem:** Parallel calls share the same memory key and try to write concurrently.

```vvm
agent helper(model="sonnet", prompt="Helpful.", memory={ scope: "project", key: "team" })

def work(item):
  return @helper `Process {item}.`(item)  # default: memory_mode="continue"

results = pmap(items, work)
```

**Why it's bad:**
- Causes lock contention (or races if a runtime is buggy)
- Serializes the parallel map (or returns `error(kind="locked")`)
- Makes memory evolution depend on scheduling order

**Solution:** Use `memory_mode="fresh"` (or per-item keys) for parallel map work, then do one sequential memory update.

```vvm
def work(item):
  return @helper `Process {item}.`(item, memory_mode="fresh")

results = pmap(items, work)
summary = @helper `Summarize and update team memory.`(results)  # single writer
```

### Silent Failures

**Problem:** Ignoring error values.

```vvm
# Bad: Errors ignored
result = @agent `Might fail.`(data, timeout="5s")
# If timeout occurs, result is an error value but we proceed anyway
final = @agent `Use result.`(result)
```

**Why it's bad:**
- Errors propagate silently
- Downstream failures are confusing
- Hard to diagnose issues

**Solution:** Always match on potential errors.

```vvm
# Good: Handle errors explicitly
result = @agent `Might fail.`(data, timeout="5s")

match result:
  case error(_):
    result = fallback(data)
  case _:
    pass

final = @agent `Use result.`(result)
```

---

### Skipping Run Inspection After Failure

**Problem:** Rerunning failed workflows immediately without inspecting run artifacts/state.

```vvm
# Bad operational loop:
# 1) run fails
# 2) rerun unchanged program
# 3) fail again with little new signal
```

**Why it's bad:**
- Repeats expensive failures
- Hides root cause behind noise
- Slows time-to-repair

**Solution:** Inspect first, then apply targeted fixes.

```vvm
# Good operational loop:
# /vvm-run-inspect <run-id>
# fix specific failure
# rerun
```

In sqlite/postgres modes, inspect execution and bindings tables to localize failing statements quickly.

---

### Fire and Forget

**Problem:** Agent calls without any error handling.

```vvm
# Bad: No error handling
@notifier `Send notification.`(event)
@logger `Log event.`(event)
# If these fail, we never know
```

**Why it's bad:**
- Failures go unnoticed
- No retry logic
- No fallback behavior

**Solution:** Handle or at least log errors.

```vvm
# Good: Check for errors
notification = @notifier `Send notification.`(event)
match notification:
  case error(_):
    @backup_notifier `Backup notification.`(event)
  case _:
    pass
```

---

### Overly Broad Exception Handling

**Problem:** Catching all errors without distinction.

```vvm
# Bad: Blanket error handling
try:
  result = complex_workflow(data)
except as err:
  result = "default"  # All errors get same treatment
```

**Why it's bad:**
- Masks different failure modes
- Can't handle specific errors appropriately
- Loses error context

**Solution:** Handle specific error types.

```vvm
# Good: Specific error handling
result = complex_workflow(data)

match result:
  case error(kind="timeout"):
    result = @fast_fallback `Quick alternative.`(data)
  case error(kind="rejected"):
    raise "Service unavailable"
  case error(_):
    result = @general_fallback `Best effort.`(data)
  case _:
    pass
```

---

### Constraint Overload

**Problem:** Too many constraints in one block.

```vvm
# Bad: Overwhelming constraints
constrain output():
  require ?`grammatically correct`
  require ?`no spelling errors`
  require ?`professional tone`
  require ?`under 500 words`
  require ?`includes introduction`
  require ?`includes conclusion`
  require ?`cites at least 3 sources`
  require ?`no passive voice`
  require ?`readable by 8th grader`
  require ?`no jargon`
```

**Why it's bad:**
- Hard to satisfy all constraints
- Unclear which failed
- Difficult to prioritize fixes

**Solution:** Group related constraints or prioritize.

```vvm
# Good: Focused constraints
constrain output():
  require ?`grammatically correct with no spelling errors`
  require ?`professional tone appropriate for executives`
  require ?`properly structured with intro and conclusion`
```

---

### Circular Dependencies

**Problem:** Functions that call each other indefinitely.

```vvm
# Bad: Circular calls
def improve(draft):
  if not ?`good`(draft):
    return refine(draft)
  return draft

def refine(draft):
  critique = @critic `Critique.`(draft)
  return improve(@writer `Fix issues.`([draft, critique]))
```

**Why it's bad:**
- Potential infinite recursion
- No termination guarantee
- Stack overflow risk

**Solution:** Use explicit iteration with bounds.

```vvm
# Good: Bounded iteration
def is_done(draft, i):
  return ?`good`(draft)

def step(draft, i):
  critique = @critic `Critique.`(draft)
  return @writer `Fix issues.`([draft, critique])

final = refine(initial, max=5, done=is_done, step=step)
```

---

## Module Anti-Patterns

### Monolithic Module

**Problem:** One module does too much, making it hard to test, modify, or reuse parts.

```vvm
# Bad: Everything in one file
input topic: "Topic"

agent researcher(model="sonnet", prompt="Research")
agent analyst(model="sonnet", prompt="Analyze")
agent writer(model="opus", prompt="Write")
agent reviewer(model="sonnet", prompt="Review")

research = @researcher `Research {topic}.`(topic)
analysis = @analyst `Analyze.`(research)
draft = @writer `Write report.`(analysis)
final = @reviewer `Review and polish.`(draft)

export final
```

**Why it's bad:**
- Can't reuse individual stages
- Hard to test in isolation
- Changes affect everything

**Solution:** Split into focused modules.

```vvm
# Good: Separate modules
# lib/research.vvm, lib/analyze.vvm, lib/write.vvm, lib/review.vvm

from "./lib/research.vvm" import * as research
from "./lib/analyze.vvm" import * as analyze
from "./lib/write.vvm" import * as write
from "./lib/review.vvm" import * as review

r = research(topic=topic)
a = analyze(data=r.data)
d = write(analysis=a.analysis)
f = review(draft=d.draft)

export f
```

---

### Deep Module Nesting

**Problem:** Module calls module which calls module, creating deep call stacks.

```vvm
# Bad: A calls B calls C calls D
from "./a.vvm" import * as a
result = a(x=input)  # A internally calls B which calls C which calls D
```

**Why it's bad:**
- Hard to trace data flow
- Difficult to debug
- Changes cascade unpredictably

**Solution:** Flatten to direct composition in the orchestrating module.

```vvm
# Good: Main orchestrates directly
from "./b.vvm" import * as b
from "./c.vvm" import * as c
from "./d.vvm" import * as d

b_result = b(input)
c_result = c(b_result.output)
d_result = d(c_result.output)
```

---

### Hardcoded Module Values

**Problem:** Module uses hardcoded values instead of inputs, reducing reusability.

```vvm
# Bad: Hardcoded values
agent researcher(model="sonnet", prompt="Research AI safety")

# Always researches the same topic
report = @researcher `Research.`(())

export report
```

**Why it's bad:**
- Module only works for one case
- Copy-paste to change behavior
- No parameterization

**Solution:** Use input declarations for configurable values.

```vvm
# Good: Parameterized
input topic: "The topic to research"
input depth: "Research depth" = "medium"

agent researcher(model="sonnet", prompt="Research expert")

report = @researcher `Research {topic} at {depth} depth.`(pack(topic, depth))

export report
```

---

### Blind Remote Imports

**Problem:** Importing remote workflows from registry/URLs without trust policy or contract inspection.

```vvm
# Bad: Unvetted remote import
from "https://random-site.example/workflow.vvm" import * as remote
result = remote(topic="security")
```

**Why it's bad:**
- Supply-chain risk from untrusted modules
- Unexpected contract drift at runtime
- Non-reproducible behavior when content changes

**Solution:** Use trusted domains, inspect contracts, and rely on cache/offline controls when required.

```vvm
# Better: registry shorthand + inspect before rollout
from "@team/workflows/security-review" import * as remote
result = remote(topic="security")
```

Operationally:
- validate with `/vvm-registry-inspect`
- enforce allowlist/denylist + HTTPS
- use `--offline`/`--cache-only` where reproducibility is required

---

### Assuming Module Output Keys Always Exist

**Problem:** Caller code accesses output keys that may be absent in evolving contracts.

```vvm
# Bad: crashes/returns unknown_output when key is absent
from "./lib/report.vvm" import * as report_mod
r = report_mod(topic="ai")
notes = r.extra_notes
```

**Why it's bad:**
- Tight coupling to unstable output surface
- Breaks consumers on benign contract evolution
- Hard to debug with remote modules

**Solution:** Guard optional keys and treat module outputs as explicit contracts.

```vvm
from "./lib/report.vvm" import * as report_mod
r = report_mod(topic="ai")

notes = r["extra_notes"]
match notes:
  case error(kind="unknown_output"):
    notes = ()
  case _:
    pass
```

---

## Summary

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| God Agent | One agent does everything | Specialized agents |
| Context Explosion | Passing everything everywhere | Pass only what's needed |
| Implicit Dependency | Over-relying on `it` | Explicit input passing |
| Spaghetti Matching | Deeply nested matches | Flatten with early returns |
| Model Inflation | Expensive models for simple tasks | Match model to task |
| Unbounded Loops | No termination guarantee | Use refine with max |
| Redundant Computation | Repeating expensive work | Cache and reuse |
| Sequential When Parallel | Independent tasks in sequence | Use pmap |
| Large Artifact Workflow in In-Context Mode | Context/token blowups and weak observability | Use artifact-backed state modes |
| Shared Memory Key (parallel) | Lock contention in branches | memory_mode="fresh" + merge |
| Assuming All Complete | Access cancelled branches | Check _completed/_winner |
| Parallel Dependencies | Branches depend on each other | Sequential for dependencies |
| Single Branch Parallel | No parallelism benefit | Direct agent call |
| Transcript Stuffing | Unbounded, low-signal memory | Digest + retain conventions |
| Persisting Secrets | Secrets leak into memory files | Keep secrets out of memory |
| Shared Memory Key (pmap) | Parallel writes/lock contention | Fresh/per-key + merge |
| Silent Failures | Ignoring error values | Match on errors |
| Skipping Run Inspection After Failure | Blind reruns without root cause | Inspect run artifacts/state first |
| Fire and Forget | No error handling | Handle or log errors |
| Overly Broad Handling | Catching all errors same way | Handle specific errors |
| Constraint Overload | Too many constraints | Group and prioritize |
| Circular Dependencies | Infinite recursion risk | Bounded iteration |
| Monolithic Module | One module does everything | Split into focused modules |
| Deep Module Nesting | Module calls module calls module | Flatten to direct composition |
| Hardcoded Module Values | No parameterization | Use input declarations |
| Blind Remote Imports | Untrusted/non-reproducible dependencies | Inspect contracts + enforce trust/cache policy |
| Assuming Module Output Keys Always Exist | Contract drift breaks callers | Guard optional outputs and handle unknown_output |
