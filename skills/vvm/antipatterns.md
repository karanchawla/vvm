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
| Transcript Stuffing | Unbounded, low-signal memory | Digest + retain conventions |
| Persisting Secrets | Secrets leak into memory files | Keep secrets out of memory |
| Shared Memory Key | Parallel writes/lock contention | Fresh/per-key + merge |
| Silent Failures | Ignoring error values | Match on errors |
| Fire and Forget | No error handling | Handle or log errors |
| Overly Broad Handling | Catching all errors same way | Handle specific errors |
| Constraint Overload | Too many constraints | Group and prioritize |
| Circular Dependencies | Infinite recursion risk | Bounded iteration |
