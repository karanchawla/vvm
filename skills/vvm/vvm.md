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

#### 4.5.3 Program Start Algorithm

When you start executing a program in filesystem state mode:

1. Generate a run-id (format: `YYYYMMDD-HHMMSS-<rand6>`)
2. Create the run directory: `.vvm/runs/<run-id>/`
3. Create the bindings directory: `.vvm/runs/<run-id>/bindings/`
4. Copy the entry program to: `.vvm/runs/<run-id>/program.vvm`
5. Initialize `state.md` with metadata header (status: running)
6. Initialize the binding counter to 0

Example narration:

```
📍 Filesystem state mode
📍 Run: 20260127-143052-a7f3b2
📍 Created .vvm/runs/20260127-143052-a7f3b2/
```

#### 4.5.4 Agent Call Algorithm

For each agent call in filesystem state mode:

```vvm
result = @agent `Task prompt.`(input)
```

Execute these steps:

1. **Allocate binding path**
   - Increment binding counter
   - Path: `.vvm/runs/<run-id>/bindings/b<counter padded to 6 digits>.md`

2. **Spawn subagent**
   - Render the task prompt template
   - Include the binding contract (Section 4.5.5)
   - Pass structured input (may contain refs from prior calls)
   - Specify the write target path

3. **Wait for completion**

4. **Verify the binding file**
   - File exists at the allocated path
   - File is non-empty
   - On failure: return `error(kind="binding_failed")`, apply `retry=` if specified

5. **Construct the ref value**

   ```vvm
   {
     ref: ".vvm/runs/<run-id>/bindings/b000001.md",
     summary: "<from subagent confirmation>",
     mime: "text/markdown"
   }
   ```

6. **Bind the variable**
   - `result` now holds the ref value

7. **Update state.md**
   - Add to binding index: name → path → summary
   - Append to trace: `[timestamp] result = @agent (b000001)`

Example narration:

```
📍 result = @researcher `Find papers on {topic}.`(topic)
⏳ Allocated: b000001.md
⏳ Spawning subagent...
📦 Binding written: b000001.md
📦 Summary: Found 3 papers on quantum computing
✅ result bound
```

#### 4.5.5 Subagent Binding Contract

When spawning a subagent, include this contract in the spawn instruction:

```text
## Binding Contract

Write your complete output to:
  .vvm/runs/<run-id>/bindings/b<counter>.md

Then return ONLY this confirmation:

  Binding written: b<counter>
  Path: .vvm/runs/<run-id>/bindings/b<counter>.md
  Summary: <1-3 sentences describing what you produced>

Your chat response contains only the confirmation above.
All substantive output goes in the file.
```

**Responsibility table:**

| Actor | Writes | Returns |
|-------|--------|---------|
| VM | binding path allocation, state.md | ref value to caller |
| Subagent | full output to binding file | confirmation + summary only |

**Why this matters:**
- Large outputs stay out of chat context
- VM can orchestrate arbitrarily large workflows
- Summaries provide enough info for routing decisions

#### 4.5.6 Downstream Ref Passing

When input to an agent call contains ref values:

```vvm
research = @researcher `Research topic.`(topic)
report = @writer `Write report.`(research)   # research is a ref
```

The VM passes ref objects as-is, not expanded file contents. Include this protocol snippet in the subagent spawn:

```text
## Ref Reading Protocol

Your input may contain ref values. A ref value looks like:

  {
    ref: ".vvm/runs/<run-id>/bindings/b000001.md",
    summary: "Brief description",
    mime: "text/markdown"
  }

Working with refs:
- Use the summary for routing decisions when possible
- Read the file at the ref path if you need full content
- You have read permission for .vvm/runs/<run-id>/bindings/**
- Cite by filename when referencing content (e.g., "per b000001.md")
```

**Good vs Bad:**

```vvm
# Good: Pass ref, let downstream decide
report = @writer `Summarize the research.`(research)

# Bad: VM expands ref contents into prompt (defeats the purpose)
# (The VM never does this — refs stay as refs)
```

#### 4.5.7 Unassigned Agent Calls

Agent calls without assignment still produce bindings:

```vvm
@notifier `Send alert.`(data)   # no variable assigned
```

The VM:
1. Allocates a binding file (same as assigned calls)
2. Spawns the subagent with binding contract
3. Records in state.md with synthetic name `_anon_<counter>`

This ensures all agent outputs are captured and inspectable.

Example state.md entry:

| Name | Ref Path | Summary |
|------|----------|---------|
| _anon_001 | .vvm/runs/.../bindings/b000003.md | Alert sent |

#### 4.5.8 Materializer Pattern

Refs keep content out of context. If you genuinely need file contents in the VM's context, use an explicit materializer agent:

```vvm
agent reader(
  model="haiku",
  permissions=perm(read=[".vvm/runs/**"], write=[], bash="deny", network="deny")
)

research = @researcher `Research quantum computing.`(topic)

# Explicitly pull excerpts into context
excerpts = @reader `Extract the 3 most relevant quotes.`(research)
```

**When to use:**
- You need specific excerpts for a semantic predicate
- You're debugging and want to see intermediate content
- A downstream agent cannot read files (unusual)

**When NOT to use:**
- Default case: let agents read refs directly
- Passing between agents: use refs
- Large intermediates: keep as refs

The materializer pattern makes costs explicit: reading a file is a visible agent call, not hidden IO.

### 4.6 Debugging with Run Artifacts

When a workflow fails or produces unexpected results, inspect the run artifacts.

#### Finding Your Run

Run directories are at `.vvm/runs/<run-id>/`. The most recent run has the latest timestamp:

```bash
ls -lt .vvm/runs/ | head -5
```

#### Reading state.md

Open `.vvm/runs/<run-id>/state.md` to see:
- **Status**: Did the run complete, fail, or get interrupted?
- **Binding Index**: Which variables were bound to which files?
- **Execution Trace**: What happened in what order?

Example state.md:

```markdown
# VVM Run: 20260127-143052-a7f3b2

Status: completed

## Binding Index

| Name | Ref Path | Summary |
|------|----------|---------|
| research | .../bindings/b000001.md | Found 3 papers |
| report | .../bindings/b000002.md | 2500-word report |

## Execution Trace

- [14:30:52] Started
- [14:30:55] research = @researcher (b000001)
- [14:31:02] report = @writer (b000002)
- [14:31:05] Completed
```

#### Inspecting Binding Files

Each agent output is in `.vvm/runs/<run-id>/bindings/b<counter>.md`. Open these to see the full output:

```bash
cat .vvm/runs/20260127-143052-a7f3b2/bindings/b000001.md
```

#### Common Issues

| Symptom | Check |
|---------|-------|
| Missing binding file | Subagent may have failed to write; check for error in trace |
| state.md very large | May have accidentally logged full outputs; check safety defaults |
| Unexpected output | Read the binding file to see what the agent actually produced |

#### Sharing Runs for Debugging

To share a run for debugging:
1. Copy the entire `.vvm/runs/<run-id>/` directory
2. Include `program.vvm`, `state.md`, and `bindings/`
3. Do NOT share if bindings contain sensitive data

### 4.7 Choosing a State Mode

VVM supports two state modes. Choose based on your workflow characteristics.

#### In-Context Mode (Default)

All state stays in token context. Agent calls return strings.

**Use when:**
- Quick prototyping and iteration
- Small programs (< 10 agent calls)
- Outputs are small (< 1KB each)
- You don't need to inspect intermediate outputs
- Tools/file access unavailable

**Characteristics:**
- No filesystem artifacts created
- All outputs visible in conversation
- Context grows with each agent call
- May hit token limits on long workflows

#### Filesystem Mode

Agent outputs written to `.vvm/runs/<run-id>/bindings/`. Agent calls return ref values.

**Use when:**
- Production workflows
- Long pipelines (10+ agent calls)
- Large intermediate outputs
- You want to inspect/debug artifacts
- Reproducibility matters

**Characteristics:**
- Creates run directory with artifacts
- Context stays bounded (refs are small)
- Can inspect any intermediate output
- Supports very long workflows

#### Switching Modes

```bash
# Default: in-context mode
/vvm-run examples/my-program.vvm

# Explicit filesystem mode
/vvm-run examples/my-program.vvm --state=filesystem
```

#### Decision Table

| Factor | In-Context | Filesystem |
|--------|------------|------------|
| Agent calls | < 10 | 10+ |
| Output sizes | Small | Any size |
| Debugging | Limited | Full artifacts |
| Token usage | Grows | Bounded |
| File access | Not needed | Required |

### 4.8 Scope and Limitations

Filesystem state mode provides artifact-backed agent outputs. The following are explicitly out of scope:

#### Database Backends

State is stored in the local filesystem only. Database backends (SQLite, PostgreSQL) are not supported. For distributed or persistent state, copy run directories manually.

#### Binary and Large Attachments

Binding files are markdown text. Binary files (images, PDFs) and very large outputs (> 10MB) should be handled by the agent writing to a separate location and including a path reference.

#### Durable Resume

Runs cannot be resumed after interruption. If a run fails partway through, you must re-run from the beginning. The `state.md` trace helps identify where failure occurred.

#### Ref URI Scheme

Refs use filesystem paths (`.vvm/runs/<id>/bindings/b000001.md`). There is no URI scheme (`vvm://...`) for cross-machine or network references.

#### Transcript Logging

Full prompts and responses are not logged by default. This is intentional for safety. If you need full transcripts for debugging, implement custom logging in your agents.

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
