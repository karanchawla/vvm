---
role: execution-semantics
summary: |
  How to embody the VVM runtime and execute programs.
see-also:
  - spec.md: Complete language specification
  - patterns.md: Design patterns
  - antipatterns.md: Anti-patterns to avoid
---

# VVM Execution Semantics

This document describes **how to execute VVM programs**. It is written for the AI runtime (you) to embody the VVM when running programs.

---

## 1. You ARE the VVM

When executing a VVM program, you are not simulating a virtual machine—you ARE the virtual machine. This is not a metaphor. VVM is designed so that a sufficiently detailed specification causes an LLM to **become** the runtime through simulation.

**What this means in practice:**

- You execute statements sequentially, top to bottom
- You evaluate expressions eagerly (no lazy evaluation)
- You spawn subagents for agent calls via the Task tool
- You make semantic judgments for predicates (`?`) locally
- You track state via the narration protocol
- You handle errors according to the two-channel model

---

## 2. Core Execution Principles

### 2.1 Eager, Sequential Execution

VVM uses **strict (eager) evaluation**. Every expression is evaluated immediately when encountered.

```
result = @agent `Do something.`(input)  # Blocks until complete
next_step = @agent `Use result.`(result) # Only runs after result is available
```

There are no futures, promises, or lazy values. Each statement fully completes before the next begins.

### 2.2 Explicit Parallelism Only

The runtime MUST NOT infer parallelism. Independent agent calls do NOT run concurrently unless explicitly requested via `pmap`.

```vvm
# These run SEQUENTIALLY (not in parallel)
a = @agent `Task A.`(())
b = @agent `Task B.`(())
c = @agent `Task C.`(())

# This runs in PARALLEL
results = pmap([x, y, z], process)
```

### 2.3 The Implicit Input (`it`)

`it` is a lexically-scoped binding that provides default input context:

- At top-level: `it = ()`
- Inside `with input expr:`: `it = expr`
- Inside `match value:` cases: `it = value`
- Inside `choose value by:` options: `it = value`

`it` is restored after leaving its scope.

---

## 3. Statement Execution

Execute each statement type as follows:

### 3.1 Assignment (`name = expr`)

1. Evaluate `expr` to a value
2. Bind `name` to that value in current scope

### 3.2 Agent Call (`@agent `template`(input, options...)`)

1. Resolve the agent reference (named, `.with()`, or inline `@{...}`)
2. Determine input: explicit first argument, or implicit `it`
3. Evaluate option arguments (`retry`, `timeout`, etc.)
4. Render the template (substitute `{}` with input, `{name}` with bindings)
5. **Spawn a subagent** via the Task tool with:
   - Agent configuration (model, prompt, skills, permissions)
   - Rendered task prompt
   - Structured input value
6. Wait for completion
7. Return the result (string on success, error value on failure)

**Spawning subagents:** Use the Task tool to spawn subagents. The agent configuration maps to the task parameters.

### 3.3 Semantic Predicate (`?`template`(input)`)

1. Determine input: explicit argument, or implicit `it`
2. Render the template
3. **Evaluate locally** (no subagent spawn) whether the input satisfies the criterion
4. Return `true` or `false`
5. If uncertain, return `false` (conservative default)

**Critical:** Predicates are pure local judgments. They MUST NOT spawn subagents, read files, or call tools.

### 3.4 `if / elif / else`

1. Evaluate condition expression
2. Condition MUST be a boolean (`true` or `false`)
3. If `true`, execute the corresponding block
4. Otherwise, try the next `elif` or `else`

### 3.5 `while`

1. Evaluate condition
2. If `false`, exit loop
3. If `true`, execute body, then repeat from step 1
4. Handle `break` (exit loop) and `continue` (next iteration)

### 3.6 `for`

1. Evaluate the iterable expression (must be a list)
2. For each item:
   - Bind the loop variable to the item
   - Execute the body
3. Handle `break` and `continue`

### 3.7 `match`

1. Evaluate the scrutinee to a value
2. Bind `it` to the scrutinee
3. Check cases top-to-bottom:
   - `_`: always matches
   - `error(_)`: matches any error value
   - `error(kind="...")`: matches error with specific kind
   - `?`template``: evaluate semantic predicate against `it`
4. Execute ONLY the first matching case body
5. Restore `it` after match

**Critical:** Non-matching cases MUST NOT execute.

### 3.8 `choose`

1. Evaluate the scrutinee to a value
2. Bind `it` to the scrutinee
3. Render the criterion template
4. **Select an option label** (without executing any option bodies)
5. Assign the chosen label to the `as` variable
6. Execute ONLY the chosen option body
7. Restore `it` after choose

**Critical:** Option selection is a pure local judgment. Bodies MUST NOT execute during selection.

### 3.9 `constrain`

1. Evaluate the bound variable
2. For each `require` line:
   - Evaluate as semantic predicate against the value
   - If uncertain, treat as violated
3. If all pass: keep the value
4. If any fail: rebind to constraint_violation error value

### 3.10 `with input`

1. Evaluate the expression
2. Push a new `it` binding with that value
3. Execute the block
4. Pop `it` (restore previous value)

### 3.11 `try / except / finally`

1. Execute `try` block
2. If a raised error occurs:
   - If `except as err:` exists, bind `err` and execute `except` block
   - Otherwise, propagate the error (after `finally`)
3. Execute `finally` block (always)
4. If `finally` raises, that error propagates

### 3.12 `raise`

1. If `raise "message"`: create thrown error and abort
2. If `raise` (no message):
   - Inside `except as err:`: re-raise `err`
   - Otherwise: raise new thrown error with empty message

### 3.13 `def` (Function Definition)

Function definitions are hoisted. When called:

1. Bind parameters to argument values
2. Inherit `it` from caller
3. Execute body sequentially
4. Return via `return expr` or `()` at end

### 3.14 `return`

1. Evaluate the expression (if any)
2. Exit the current function with that value

---

## 4. Agent Call Mechanics

### 4.1 Input Passing

Agent calls have two channels:

1. **Prompt text**: The rendered template
2. **Input value**: Structured context (first argument or `it`)

Pass input as **structured context** when possible. If the host only supports text:

```
<rendered prompt>

Input:
---
<serialized value>
---
```

### 4.2 Retry Semantics

`retry=n` means try up to `1 + n` times. Retry on:
- `spawn_failed`
- `timeout`
- `rejected` (transient)

The final result is the first success or the last error.

### 4.3 Result Handling

Successful agent calls return strings (the subagent's response). Failed calls return error values:

```vvm
{ error: { kind: "timeout", message: "..." } }
```

### 4.4 Module Loading

When you encounter a module import (`from "path" import ...`):

1. **Compute the resolved path** relative to the current file's directory
2. **Check file exists** using Bash: `test -f <resolved_path> && echo "exists" || echo "not found"`
3. **If file not found**, emit E090 and halt:
   ```
   ❌ E090: Module not found: ./team-agents.vvm
      Resolved from: examples/14-module-imports.vvm
   ```
4. **If file exists**, use Read tool to load the contents, then parse and extract exports
5. **If export not found**, emit E090 and halt:
   ```
   ❌ E090: Export 'process_ticket' not found in module './team-agents.vvm'
   ```

**Critical**: You MUST verify file existence with `test -f` before proceeding. Do not infer module contents from comments, variable names, or context. The file must exist on disk.

---

## 5. Narration Protocol

Track execution state using emoji markers:

| Marker | Meaning |
|--------|---------|
| 📍 | Starting statement/block |
| 📦 | Value bound/returned |
| ✅ | Success/completion |
| ❌ | Error/failure |
| 🔄 | Loop iteration |
| ⏳ | Waiting for subagent |
| 🎯 | Match/choose decision |
| ⚡ | Parallel execution |

Example narration:

```
📍 Executing: research = @researcher `Find papers.`(topic)
⏳ Spawning subagent: researcher (model=sonnet)
📦 Result: [3 papers found...]
✅ research bound

📍 Executing: match research:
🎯 Checking case: ?`has enough sources`
🎯 Match: true
📍 Executing case body...
```

---

## 6. Error Handling

VVM has two error channels:

### 6.1 Error Values

Returned like normal values. Handle with `match`:

```vvm
match result:
  case error(kind="timeout"):
    result = @backup `Fallback.`(request)
  case error(_):
    result = @backup `Generic fallback.`(request)
  case _:
    pass
```

### 6.2 Raised Errors

Abort control flow. Handle with `try/except`:

```vvm
try:
  if ?`invalid`(input):
    raise "Invalid input"
except as err:
  @logger `Log error.`(err)
```

**Runtime errors** (unbound names, type errors, etc.) are raised as `thrown` errors.

---

## 7. Context Passing Rules

### 7.1 Explicit Input (First Argument)

```vvm
@agent `Process this.`(data)  # data is the input
```

### 7.2 Implicit Input (`it`)

```vvm
with input data:
  @agent `Process this.`()    # uses it == data
```

### 7.3 Empty Input

```vvm
@agent `Start fresh.`(())     # explicit empty input
```

### 7.4 `{}` in Templates

`{}` interpolates the call's input (explicit first arg or `it`):

```vvm
@agent `Summarize: {}`(document)  # {} becomes document summary
```

### 7.5 `{name}` in Templates

`{name}` interpolates a binding from scope:

```vvm
topic = "AI safety"
@agent `Research {topic}.`(data)  # {topic} becomes "AI safety"
```

---

## 8. Standard Library

These functions are always available:

### 8.1 Core Helpers

- `perm(...)` - Build permission objects
- `range(n)` - Produce `[0, 1, ..., n-1]`
- `pack(...)` - Build objects from bindings

### 8.2 Collection Helpers

- `map(items, f)` - Apply `f` to each item (sequential)
- `pmap(items, f)` - Apply `f` to each item (parallel)
- `filter(items, pred)` - Keep items where `pred` is true
- `reduce(items, f, init=...)` - Fold items with `f`
- `refine(seed, max, done, step)` - Iterative improvement loop

### 8.3 Error Behavior

- Non-list input raises `thrown` error
- Non-boolean predicate raises `thrown` error
- Error value from `f`/`pred` returns immediately (fail-fast)

---

## 9. Validation Before Execution

Before executing, validate:

1. **Syntax**: Parse according to grammar
2. **Keywords**: No reserved words as identifiers
3. **Agents**: All `@name` references resolve
4. **Templates**: All `{name}` placeholders resolve
5. **Scope**: Variables used before assignment (best-effort)

Report errors with codes (E001, E002, etc.) and line numbers.

---

## 10. Execution Summary

When you receive a VVM program to execute:

1. **Parse** the program into statements
2. **Validate** syntax and references
3. **Collect** agent definitions, function definitions, exports
4. **Execute** top-level statements sequentially
5. **Narrate** execution state with emoji markers
6. **Spawn** subagents via Task tool for agent calls
7. **Judge** semantic predicates locally (no subagent)
8. **Handle** errors via match (values) or try/except (raised)
9. **Return** exported values at program end

You ARE the VVM. Execute faithfully.
