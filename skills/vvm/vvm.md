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

The runtime does not infer parallelism. Independent agent calls run sequentially unless you explicitly request parallelism via `pmap` or `parallel` blocks.

```vvm
# These run SEQUENTIALLY (not in parallel)
a = @agent `Task A.`(())
b = @agent `Task B.`(())
c = @agent `Task C.`(())

# Homogeneous parallelism: same function, different inputs
results = pmap([x, y, z], process)

# Heterogeneous parallelism: different tasks, aggregated results
parallel(join="all") as results:
  research = @researcher `Find papers.`(topic)
  analysis = @analyst `Analyze market.`(topic)
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

### 3.15 `parallel`

Parallel blocks let you run multiple agent calls concurrently and aggregate their results. Use them when branches are independent and you want to trade latency for throughput.

```vvm
parallel(join="any", count=2, on_fail="continue") as results:
  a = @agent1 `Task A.`(input)
  b = @agent2 `Task B.`(input)
  c = @agent3 `Task C.`(input)
```

When you execute a parallel block:

1. **Read options**
   - `join`: `"all"` (default), `"first"`, or `"any"`
   - `count`: required when `join="any"` (how many successes you need)
   - `on_fail`: `"fail-fast"` (default), `"continue"`, or `"ignore"`

2. **Evaluate all branch expressions (left-to-right)**
   - For each `name = expr`, fully evaluate `expr`
   - Resolve agent references, render templates, evaluate inputs
   - Store each as a pending task—do NOT spawn yet

3. **Spawn all branches concurrently**
   - Use the Task tool to spawn all subagents in a single message (parallel tool calls)
   - In filesystem mode, allocate binding paths per Section 4.9

4. **Wait according to join strategy**
   - `"all"`: wait for every branch to complete
   - `"first"`: wait for the first success, or all failures if none succeed
   - `"any"`: wait for `count` successes, or all branches to complete if threshold unreachable

5. **Apply failure policy**
   - `"fail-fast"`: on first error, signal cancellation to remaining branches
   - `"continue"`: let all branches complete; convert raised errors to error values
   - `"ignore"`: like `"continue"`, but replace errors with `()`

6. **Construct result object**
   - Add completed branch results as named fields
   - For `"first"`: add `_winner` field naming the successful branch (omit if all failed)
   - For `"any"`: add `_completed` list of branches that met the threshold (may be fewer than `count` if threshold unreachable)

7. **Cancel remaining branches (best-effort)**
   - Signal cancellation to any still-running branches
   - Late results are ignored (not added to result object)

8. **Bind result to `as` variable**

**Spawning branches concurrently:** Use multiple Task tool calls in a single message. The Task tool supports parallel invocations.

In filesystem mode, see Section 4.9 for binding path allocation and branch execution IDs.

**Join strategy determines completion:**

| Strategy | Waits for | Result shape |
|----------|-----------|--------------|
| `"all"` | Every branch | All branches present |
| `"first"` | First success | `_winner` names the winner |
| `"any"` | N successes | `_completed` lists finishers |

---

### 3.16 `input` Provisioning

When executing a program with declared inputs, you must provision values before execution begins.

**Top-level execution (run directly):**

1. Parse input declarations from the program
2. For each input:
   - Check if host provides a value (CLI flag, environment)
   - If not provided and required, prompt the user with the input's description
   - If optional and not provided, use the default value
   - Bind the value to the input name
3. If any required input cannot be provisioned, return `error(kind="missing_input", name="...")`
4. Proceed with execution

**Host provisioning mechanisms:**
- CLI: `--input topic="AI safety" --input depth="deep"`
- Interactive: Prompt user with input description
- API: Structured input object `{ topic: "...", depth: "..." }`

**Recording in state.md (filesystem mode):**

```markdown
## Inputs

| Name | Value | Source |
|------|-------|--------|
| topic | AI safety | cli |
| depth | medium | default |
```

### 3.17 Module Calls

When a module is imported with `* as name`, it becomes callable. Calling it executes the module with the provided inputs and returns its output contract (derived from `export` declarations).

```vvm
from "./lib/research.vvm" import * as research

result = research(topic="AI safety", depth="deep")
report = result.report
```

#### Module Call Algorithm

When you encounter a module call `name(arg1=val1, arg2=val2, ...)`:

1. **Resolve the module**
   - Look up `name` in the current environment
   - Verify it references an imported module (not a function)

2. **Validate arguments**
   - For each argument, check it matches a declared input in the module
   - If an argument doesn't match any input: return `error(kind="unknown_input", name="...")`
   - For each required input not provided: return `error(kind="missing_input", name="...")`
   - Apply default values for optional inputs not provided

3. **Create module execution context**
   - In filesystem mode, create subdirectory: `.vvm/runs/<run-id>/modules/<name>--<hash>/`
   - Initialize bindings directory and state.md for the module

4. **Execute module body**
   - Bind input values to their declared names
   - Execute statements sequentially
   - Track exports as output-contract keys

5. **Return result object**
   - Collect all exported values into a result object (the workflow outputs)
   - If an export is a ref, pass it through unchanged
   - If execution raised an error: return `error(kind="module_failed", module="...", error=...)`
   - If caller accesses a missing output key: return `error(kind="unknown_output", name="...")`

#### Binding Directory Structure

When a called module executes in filesystem mode:

```
.vvm/runs/<run-id>/
  bindings/              # Parent module's bindings
  state.md               # Parent module's state
  modules/
    research--a7b3c9/    # Called module
      bindings/          # Module's bindings
        b001.md
        b002.md
      state.md           # Module's state
```

The hash suffix (`a7b3c9`) is derived from the call arguments to ensure unique directories for different invocations.

#### Ref Resolution

Refs created by the called module point to its bindings directory:

```vvm
# In main.vvm
result = research(topic="AI")
# result.report might be:
# { ref: ".vvm/runs/abc123/modules/research--a7b3c9/bindings/b001.md", ... }
```

The caller receives refs unchanged. If the caller passes a ref to another agent, that agent can read the file at the ref path.

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

### 4.4.1 URL and Registry Module Loading

When you encounter a remote module import (`from "..." import ...` where the path is a URL or registry shorthand):

1. **Load configuration** (see Section 4.4.2)
   - Read `.vvm/.env` if present
   - Apply environment variable overrides
   - Use defaults for missing keys

2. **Resolve import path**

   **If path starts with `https://`:**
   - Use the URL directly
   - Validate domain against allowlist/denylist
   - If blocked: emit E091 with `reason="domain_blocked"` and halt

   **If path starts with `http://`:**
   - If `VVM_REGISTRY_REQUIRE_HTTPS=1` (default): emit E092 and halt
   - Otherwise: proceed with warning

   **If path starts with `@` (registry shorthand):**
   - Strip the `@` prefix
   - Construct URL: `{VVM_REGISTRY_BASE_URL}{path}.vvm`
   - Validate domain against allowlist/denylist
   - If blocked: emit E091 with `reason="domain_blocked"` and halt

   **Otherwise:**
   - Treat as local path (existing behavior in Section 4.4)

3. **Check local cache**
   - Compute cache path: `.vvm/registry/<escaped_url>/<hash[:12]>/module.vvm`
   - URL escaping: `://` → `_`, `/` → `__`, `:` → `_c_`, `?` → `_q_`
   - Example: `https://vvm.dev/alice/research.vvm` → `https_vvm.dev__alice__research.vvm`
   - If cache exists and not expired (< 1 hour from `fetched_at`), use cached module
   - Otherwise proceed to fetch

4. **Fetch remote module**
   - Use WebFetch or equivalent HTTP client
   - Timeout: 30 seconds
   - On network error: emit E091 with message and halt
   - On 4xx/5xx response: emit E091 with status code and halt
   - On success: proceed to cache

5. **Cache the module**
   - Compute SHA-256 hash of content
   - Create cache directory: `.vvm/registry/<escaped_url>/<hash[:12]>/`
   - Write `module.vvm` with fetched content
   - Write `meta.json`:
     ```json
     {
       "source_url": "<url>",
       "content_hash": "<full sha256>",
       "fetched_at": "<ISO timestamp>",
       "content_length": <bytes>
     }
     ```

6. **Record in run imports** (filesystem state mode)
   - Append to `.vvm/runs/<run-id>/imports.json`
   - Include original source, resolved URL, and content hash

7. **Parse and validate**
   - Read cached `module.vvm`
   - Parse as VVM module
   - Resolve requested exports
   - If export not found: emit E090

### 4.4.2 Configuration Loading

When starting program execution, load registry configuration:

1. **Initialize defaults**
   ```
   VVM_REGISTRY_BASE_URL = "https://vvm.dev/"
   VVM_REGISTRY_ALLOWLIST_DOMAINS = ""
   VVM_REGISTRY_DENYLIST_DOMAINS = ""
   VVM_REGISTRY_REQUIRE_HTTPS = "1"
   ```

2. **Read `.vvm/.env` if present**
   - Parse as standard dotenv format
   - Override defaults with file values

3. **Read environment variables**
   - Override with any matching `VVM_*` environment variables

4. **Parse domain lists**
   - Split comma-separated values into arrays
   - Trim whitespace from each domain

**Domain validation algorithm:**

```
1. Extract domain from URL
2. If allowlist is non-empty:
   - If domain in allowlist: ALLOW
   - Otherwise: BLOCK
3. If denylist is non-empty:
   - If domain in denylist: BLOCK
4. ALLOW (default)
```

**Narration for URL imports:**

```
📍 Loading module: https://example.com/lib/research.vvm
📦 Cache miss - fetching from network
⏳ Fetching... (30s timeout)
✅ Cached at .vvm/registry/https_example.com__lib__research.vvm/a7b3c9d2e1f0/
📍 Parsing module...
✅ deep_research imported
```

**Narration for registry shorthand:**

```
📍 Loading module: @alice/research
📍 Resolving: https://vvm.dev/alice/research.vvm
📦 Cache miss - fetching from network
✅ Cached, deep_research imported
```

**Error examples:**

```
❌ E091 line 3: URL fetch failed: https://example.com/lib/utils.vvm
   Status: 404 Not Found

❌ E091 line 5: Domain blocked: untrusted.com
   Configure VVM_REGISTRY_ALLOWLIST_DOMAINS to permit.

❌ E092 line 7: Insecure protocol rejected: http://example.com/lib/utils.vvm
   Use https:// for remote imports.

❌ E093 line 9: Invalid URL format: file:///local/path.vvm
   Use relative paths for local imports (e.g., ./path.vvm)
```

### 4.4.3 Contract Extraction

When compiling a module (local or remote), extract the contract to show users what inputs are required and what outputs are produced. This is read-only — no execution, no agent calls.

**Extract input declarations:**

For each `input` statement in the module:
- `input name: "description"` → required input with description
- `input name: "description" = default` → optional input with description and default
- `input name = default` → optional input with default (no description)

**Extract export declarations (as outputs):**

For each `export name` statement, record the exported identifier.

**Contract output format:**

```
Contract:
  Inputs:
    topic (required): "The topic to research"
    depth (optional = "medium"): "Research depth"

  Outputs:
    report
    summary
```

If there are no inputs: `Inputs: (none)`

If there are no exports: `Outputs: (none)`

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

## Inputs

| Name | Value | Source |
|------|-------|--------|
| topic | AI safety | cli |
| depth | medium | default |

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
6. Parse input declarations and provision values (see Section 3.16)
7. Record inputs in `state.md` with name, value, and source
8. Initialize the binding counter to 0

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

## Inputs

| Name | Value | Source |
|------|-------|--------|
| topic | AI | cli |

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

### 4.9 Parallel Block Mechanics (Filesystem State Mode)

Parallel blocks in filesystem mode use branch-specific binding paths to keep outputs separate. Each branch writes to its own file, and the VM aggregates results into a single object.

#### 4.9.1 Branch Execution IDs

Each parallel block gets a counter (`p001`, `p002`, ...). Each branch within a block gets a unique execution ID combining the block counter and branch name:

```
.vvm/runs/<run-id>/bindings/
  b000001.md           # Sequential call before parallel
  p001_research.md     # Parallel block 1, branch "research"
  p001_analysis.md     # Parallel block 1, branch "analysis"
  p001_review.md       # Parallel block 1, branch "review"
  b000002.md           # Sequential call after parallel
```

This naming convention:
- Keeps parallel branches visually grouped
- Avoids counter collisions between sequential and parallel calls
- Makes it clear which branches belong to which parallel block

#### 4.9.2 Parallel Block Algorithm

Execute these steps:

1. **Increment parallel block counter**
   - First parallel block is `p001`, second is `p002`, etc.

2. **Allocate binding paths for all branches**
   - For each branch `name`, path is: `.vvm/runs/<run-id>/bindings/p<block>_<name>.md`

3. **Spawn all branches via parallel Task calls**
   - Send a single message with multiple Task tool invocations
   - Each task receives the binding contract with its branch-specific path
   - Include the Ref Reading Protocol if input contains refs

4. **Collect results as branches complete**
   - Track which branches have completed
   - Track which branches succeeded vs failed
   - Apply failure policy as results arrive

5. **Construct ref values for completed branches**

   ```vvm
   {
     ref: ".vvm/runs/<run-id>/bindings/p001_research.md",
     summary: "<from subagent confirmation>",
     mime: "text/markdown"
   }
   ```

6. **Build result object**
   - Each branch name maps to its ref value (or error value)
   - Add metadata per Section 3.15 step 6 (`_winner` for first, `_completed` for any)

7. **Update state.md**
   - Add parallel block entry to trace
   - Record each branch status and binding path

#### 4.9.3 Binding Contract for Parallel Branches

Each branch subagent receives the standard binding contract (Section 4.5.5) with the branch-specific path:

```text
## Binding Contract

Write your complete output to:
  .vvm/runs/<run-id>/bindings/p001_research.md

Then return ONLY this confirmation:

  Binding written: p001_research
  Path: .vvm/runs/<run-id>/bindings/p001_research.md
  Summary: <1-3 sentences describing what you produced>

Your chat response contains only the confirmation above.
All substantive output goes in the file.
```

The only difference from sequential agent calls is the path format (`p<block>_<name>` vs `b<counter>`).

#### 4.9.4 state.md Trace Format

Parallel blocks add richer trace entries to `state.md`:

```markdown
## Execution Trace

- [14:30:52] parallel block (p001)
  - Options: join="any", count=3, on_fail="continue"
  - Branches: research, analysis, review, validation, summary
  - Paths allocated:
    - research → bindings/p001_research.md
    - analysis → bindings/p001_analysis.md
    - review → bindings/p001_review.md
    - validation → bindings/p001_validation.md
    - summary → bindings/p001_summary.md

- [14:30:55] Branch complete: p001_analysis (success)
  - Summary: "Market analysis complete"

- [14:30:56] Branch complete: p001_research (success)
  - Summary: "Found 5 papers"

- [14:30:57] Branch complete: p001_validation (error)
  - Error: timeout

- [14:30:58] Parallel block complete: p001
  - Join threshold met: 2/3 (count=2 with join="any")
  - Completed: [analysis, research]
  - Cancelled: [review, summary]
  - Result bound to: results
```

This trace format lets you:
- See which branches completed in what order
- Identify failures vs cancellations
- Understand why a threshold was met

#### 4.9.5 Cancellation and Late Results

When a join threshold is met before all branches complete:

1. **Signal cancellation (best-effort)**
   - The VM cannot force-stop running subagents
   - Use TaskStop if available, otherwise note cancellation intent

2. **Handle late completions**
   - Late results are NOT added to the result object
   - Late binding files may still be written (subagent completed its work)
   - Record in state.md: branch marked as "cancelled (late completion)"

3. **Deterministic results**
   - The result object contains exactly the branches that completed before the threshold
   - `_completed` lists branches in completion order
   - This ensures the same result regardless of cancellation support

**Late completion artifacts:**

When a cancelled branch completes late, its binding file still exists on disk. This is intentional—the subagent did the work, and you might want to inspect it for debugging. The file just isn't included in the result object.

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
| ⚡ | Parallel block start |
| 🔀 | Branch spawned |
| 🏁 | Branch complete |
| ⏹️ | Branch cancelled |

Example narration for sequential execution:

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

Example narration for parallel execution:

```
⚡ parallel block (p001): join="any", count=2, on_fail="continue"
   Branches: research, analysis, review

🔀 Spawning 3 branches concurrently...
   - research → p001_research.md
   - analysis → p001_analysis.md
   - review → p001_review.md

🏁 p001_analysis complete (success)
   Summary: "Market growing 15% YoY"

🏁 p001_research complete (success)
   Summary: "Found 5 relevant papers"

⏹️ p001_review cancelled (threshold met)

✅ results bound: { _completed: ["analysis", "research"], ... }
```

The parallel narration makes visible:
- Which branches are spawned together
- Completion order (not definition order)
- Why early termination occurred
- What's in the result object

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
3. **Collect** agent definitions, function definitions, exports (output contract keys)
4. **Execute** top-level statements sequentially
5. **Narrate** execution state with emoji markers
6. **Spawn** subagents via Task tool for agent calls
7. **Spawn parallel branches** via multiple Task calls in a single message
8. **Judge** semantic predicates locally (no subagent)
9. **Handle** errors via match (values) or try/except (raised)
10. **Return** exported values at program end (workflow outputs)

You ARE the VVM. Execute faithfully.
