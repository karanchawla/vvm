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
3. Evaluate option arguments (`retry`, `timeout`, `memory_mode`, etc.)
4. Render the template (substitute `{}` with input, `{name}` with bindings)
5. If the resolved agent config has `memory=...` and `memory_mode!="fresh"`:
   - Resolve the memory directory per `spec.md` Section 3.5
   - Acquire a single-writer lock for that memory key (or return `error(kind="locked")`)
   - Read `digest.md` and (optionally) a bounded recent tail from `ledger.jsonl`
   - Construct a **Memory Context** prelude (clearly delimited) and prepend it to the rendered task prompt
   - Include a short “Memory Update Protocol” snippet describing the `vvm-memory` patch channel
6. **Spawn a subagent** via the Task tool with:
   - Agent configuration (model, prompt, skills, permissions)
   - Rendered task prompt (including Memory Context prelude when applicable)
   - Structured input value
7. Wait for completion
8. If the subagent fails: release any held lock and return an error value (no memory writes).
9. If the subagent succeeds:
   - Strip any fenced ```vvm-memory``` block from the response (always strip; it is a reserved channel)
   - If `memory_mode=="continue"` and `memory=...` is bound:
     - Parse the block as JSON; validate size + secret-safety
     - If valid, apply atomically:
       - overwrite `digest.md` (write temp + rename)
       - append a JSONL entry to `ledger.jsonl` containing `{ts, digest?, retain?}`
     - If invalid/unsafe, apply no writes
   - If `memory_mode=="dry_run"` or `"fresh"`, apply no writes
   - Release any held lock
   - Return the user-visible output string

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

### 4.5 Run State Management (Filesystem State Mode)

When operating in **filesystem state mode**, the VM creates a run directory for each execution:

```
.vvm/
  runs/
    <run-id>/
      program.vvm         # Copy of entry program
      state.md            # VM-owned trace + binding index (small)
      bindings/           # Agent output artifacts
        b000001.md
        b000002.md
        ...
      imports/            # Reserved for nested workflow executions
```

**Ownership rules:**
- **VM owns**: `program.vvm`, `state.md`, directory creation
- **Subagents write**: `bindings/b<counter>.md` (write-only, one file per call)
- **Reserved**: `imports/` (for nested workflow executions)

**Binding file naming:**
- Files named by monotonic call counter: `b000001`, `b000002`, ...
- NOT by variable name (avoids collisions in loops/functions)
- VM maintains name→ref mapping in `state.md`

#### 4.5.1 Run ID Generation

Generate run-id with format: `YYYYMMDD-HHMMSS-<rand6>`

Example: `20260127-143052-a7f3b2`

Properties:
- Sortable by time (lexicographic = chronological)
- Unique (6 random chars prevent collisions for concurrent runs)
- Human-readable (date visible at glance)

#### 4.5.2 state.md Format

The `state.md` file is the VM's execution trace and binding index. It MUST remain small.

**Required sections:**

```markdown
# VVM Run: <run-id>

Program: <program-path>
Started: <ISO timestamp>
Updated: <ISO timestamp>
Status: running | completed | failed

## Binding Index

| Name | Ref Path | Summary |
|------|----------|---------|
| research | .vvm/runs/.../bindings/b000001.md | Found 3 papers... |
| report | .vvm/runs/.../bindings/b000002.md | 2500-word report... |

## Execution Trace

- [timestamp] Started execution
- [timestamp] research = @researcher (b000001)
- [timestamp] report = @writer (b000002)
- [timestamp] Completed with 2 exports
```

**MUST NOT contain:**
- Full prompts or responses
- Megatext dumps
- Sensitive data (credentials, secrets)

**Purpose:**
- Quick inspection: "what happened in this run?"
- Debugging: find which binding has which output
- NOT for full transcript replay

#### 4.5.3 Program Start Procedure

When starting execution in filesystem state mode, the VM MUST:

1. **Generate run-id** using format `YYYYMMDD-HHMMSS-<rand6>`
2. **Create run directory**: `.vvm/runs/<run-id>/`
3. **Create bindings directory**: `.vvm/runs/<run-id>/bindings/`
4. **Copy entry program**: Write source to `.vvm/runs/<run-id>/program.vvm`
5. **Initialize state.md**: Create with metadata header (run-id, program path, start timestamp, status=running)
6. **Initialize counters**: Set binding counter to 0, anonymous counter to 0

Example initialization:

```
📍 Filesystem state mode enabled
📍 Created run directory: .vvm/runs/20260127-143052-a7f3b2/
📍 Copied program to: .vvm/runs/20260127-143052-a7f3b2/program.vvm
📍 Initialized state.md
```

#### 4.5.4 Agent Call Handling

For each agent call in filesystem state mode:

```vvm
result = @agent `Task prompt.`(input)
```

The VM MUST execute this algorithm:

**Step 1: Allocate binding path**
- Increment binding counter
- Path: `.vvm/runs/<run-id>/bindings/b<6-digit-counter>.md`
- Example: `b000001.md`, `b000002.md`, ...

**Step 2: Spawn subagent with binding instruction**

Include in the subagent spawn:
- The task prompt (rendered template)
- Structured input (may contain ref values from prior calls)
- Write target path
- Binding instruction (see Section 4.5.5)

**Step 3: Wait for completion**

**Step 4: Verify binding file**
- Check file exists at the allocated path
- Check file is non-empty
- If missing or empty: treat as error, apply `retry=` if specified, or return `error(kind="binding_failed")`

**Step 5: Construct ref value**

```vvm
result = {
  ref: ".vvm/runs/<run-id>/bindings/b000001.md",
  summary: "<summary from subagent confirmation>",
  mime: "text/markdown"
}
```

**Step 6: Update state.md**
- Add row to binding index: `result` → ref path → summary
- Append to execution trace: `[timestamp] result = @agent (b000001)`

Example narration:

```
📍 Executing: result = @agent `Task prompt.`(input)
⏳ Allocated binding: b000001.md
⏳ Spawning subagent with binding instruction...
📦 Subagent wrote to: .vvm/runs/.../bindings/b000001.md
📦 Summary: "Completed analysis of 3 documents"
✅ result bound to ref value
```

#### 4.5.5 Subagent Contract

When spawning a subagent in filesystem state mode, include this binding instruction:

```text
## Binding Instruction

You MUST write your complete output to this file:
  Path: .vvm/runs/<run-id>/bindings/b<counter>.md

After writing, return ONLY a short confirmation in this format:

  Binding written: b<counter>
  Path: .vvm/runs/<run-id>/bindings/b<counter>.md
  Summary: <1-3 sentence summary of what you produced>

CRITICAL:
- Write ALL output to the file, not to this chat
- Your chat response must be ONLY the confirmation above
- Do NOT paste file contents into the chat response
- The summary must be bounded (1-3 sentences maximum)
```

**Subagent requirements:**
- MUST write full output to the specified path using the Write tool
- MUST return only the confirmation payload (not the full output)
- MUST provide a bounded summary (1-3 sentences)
- MUST NOT include file contents in the chat response

**Why this matters:**
- Token control: large outputs don't consume VM context
- Safety: sensitive content stays in files, not chat logs
- Scalability: VM can orchestrate arbitrarily large workflows

#### 4.5.6 Non-Assigned Agent Calls

If an agent call result is not assigned to a variable:

```vvm
@notifier `Send alert.`(data)   # no assignment
```

The VM SHOULD still:
1. Allocate a binding file
2. Execute the subagent with binding instruction
3. Record in state.md with synthetic name `_anon_<counter>`

This ensures all agent outputs are captured and inspectable, even for side-effect-only calls.

Example state.md entry:

```markdown
| _anon_001 | .vvm/runs/.../bindings/b000003.md | Alert sent successfully |
```

#### 4.5.7 Downstream Ref Passing

When an agent call receives input containing ref values:

```vvm
research = @researcher `Research topic.`(topic)
report = @writer `Write report.`(research)   # research is a ref value
```

The VM MUST:

1. **Pass ref objects as-is** (not expanded file contents)
2. **Include the Ref Reading Protocol** in the subagent context

Ref Reading Protocol (include in subagent spawn):

```text
## Ref Reading Protocol

Your input contains ref values. A ref value looks like:
{
  ref: ".vvm/runs/<run-id>/bindings/b000001.md",
  summary: "Brief description of contents",
  mime: "text/markdown"
}

To work with ref values:
- The `summary` field gives you a preview of the content
- If you need full content, use the Read tool on the `ref` path
- You have read permission for: .vvm/runs/<run-id>/bindings/**
- When citing content, reference by path (e.g., "per b000001.md")

Do NOT assume ref contents from the summary alone if precision matters.
```

**Why pass refs instead of contents:**
- Downstream agent decides if full content is needed
- Small summaries may suffice for many tasks
- Keeps VM context bounded regardless of intermediate sizes

#### 4.5.8 Materializer Pattern

If you need to pull file contents into VM context (rare), use an explicit materializer agent:

```vvm
agent reader(
  model="haiku",
  permissions=perm(read=[".vvm/runs/**"], write=[], bash="deny", network="deny")
)

# Get research as ref value
research = @researcher `Research quantum computing.`(topic)

# Explicitly materialize excerpts into context
excerpts = @reader `Read the research and extract the 3 most relevant quotes.`(research)

# Now excerpts is a ref, but the reader has already done the extraction
report = @writer `Write a report using these quotes.`(excerpts)
```

**When to use materializers:**
- You need specific excerpts in VM context
- A semantic predicate needs to evaluate actual content
- You're debugging and want to inspect intermediate values

**When NOT to use materializers:**
- Default case: let downstream agents read refs directly
- Passing data between agents (use refs)
- Large intermediates (keep as refs)

This pattern keeps costs explicit: materialization is a visible agent call, not hidden IO.

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

### 8.4 Safety Defaults (Filesystem State Mode)

When operating in filesystem state mode, the runtime enforces safe defaults:

**Git exclusion:**
- `.vvm/` MUST be in `.gitignore` (local state, not version-controlled)

**No transcript logging:**
- Do NOT write full prompts/responses to disk by default
- `state.md` contains only: metadata, binding index, short narration
- Opt-in transcript logging may be added later with explicit flag

**Subagent permissions (least privilege):**
- **Write scope**: Only `.vvm/runs/<run-id>/bindings/**`
- **Read scope**: Only when explicitly needed (materializer agents)
- Subagents MUST NOT write outside their binding file

**Atomic writes:**
- Use write-then-rename for `state.md` updates (crash-safe)
- Binding files are write-once (no updates after creation)

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
