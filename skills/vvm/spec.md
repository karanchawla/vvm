---
role: language-specification
summary: |
  Complete normative specification for VVM - syntax, semantics, validation rules, and grammar.
see-also:
  - vvm.md: Execution semantics (how to BE the VM)
  - patterns.md: Design patterns for VVM programs
  - antipatterns.md: Anti-patterns to avoid
  - SKILL.md: Skill metadata and quick reference
---

# VVM

**Vibe Virtual Machine**

*A language for agentic programs where the LLM is the runtime.*

Status: draft
Version: 0.0.1

---

## 0. About This Document (Normative)

This file is the **language reference** for VVM and the **normative specification** for any VVM runtime.

In VVM, the “runtime” is typically an AI session in an agentic tool. A conforming runtime must be able to:
1. Parse a program
2. Validate it (errors + warnings)
3. Execute it according to the semantics here

### 0.1 Normative language

This spec uses:
- **MUST** / **MUST NOT** for required behavior
- **SHOULD** / **SHOULD NOT** for strong guidance
- **MAY** for optional behavior

If a host tool cannot implement a MUST exactly (due to platform constraints), it SHOULD surface a clear error value rather than silently changing semantics.

### 0.2 Reading guide

- **Authors**: read Sections 1–14.
- **Runtime implementers**: read Sections 0, 12, 15, 16.
- **When uncertain**: prefer conservative behavior that preserves safety (e.g. do not claim a semantic predicate is true if it is unclear).

---

## 0.3 File Format

| Property         | Value                      |
| ---------------- | -------------------------- |
| Extension        | `.vvm` (convention)        |
| Encoding         | UTF-8                      |
| Case sensitivity | Case-sensitive             |
| Indentation      | Spaces only (Python-like)  |
| Line endings     | LF or CRLF                 |

VVM programs are intended to be pasted directly into an AI session along with this spec, but the file format rules make them portable and toolable.

---

## 0.4 Lexical Structure

### 0.4.1 Whitespace and indentation

- Indentation is significant only after `:` (block introducers): `if`, `while`, `for`, `match`, `choose`, `try`, `except`, `finally`, `with input`, and `constrain`.
- Tabs MUST NOT be used for indentation.
- A blank line is allowed anywhere and has no effect.

### 0.4.2 Statement boundaries

- A statement normally ends at a newline.
- Newlines inside `(...)`, `[...]`, `{...}`, or inside string/template literals do not end a statement (implicit line continuation).
- Trailing commas are allowed in multi-line argument lists, list literals, and object literals.

### 0.4.3 Comments

Comments begin with `#` and extend to end of line. Comments are ignored by execution.

Rules:
- `#` inside a string literal (`"..."` or `"""..."""`) is not a comment.
- `#` inside a template literal (backticks) is part of the template text, not a comment.

### 0.4.4 Identifiers

Identifiers match `/[a-zA-Z_][a-zA-Z0-9_]*/`.

Reserved keywords MUST NOT be used as **user-defined names** (variables, functions, agents, parameters, import aliases). See Validation Rules.

---

## 0.5 Literals and Templates

VVM has two different “text” syntaxes:
- **String literals** (`"..."`, `"""..."""`) are ordinary values.
- **Template literals** (`` `...` ``) are used for prompts and semantic criteria and support `{...}` placeholders.

### 0.5.1 String literals

Syntax:
- `"single line"`
- `"""multi\nline"""`

Rules (portable):
- Strings support JSON-style escapes at minimum: `\\`, `\"`, `\n`, `\t`.
- Unknown escape sequences are validation errors.
- String literals do not perform interpolation.

### 0.5.2 Template literals (backticks)

Template literals are used in:
- agent calls: `@agent `prompt`(...)`
- semantic predicates: `?`criteria`(...)` (including in `require ?`...`` and `choose ... by ?`...``)

Rules (portable):
- Templates may be multiline.
- To include a literal backtick inside a template, escape as ``\` ``.
- Backslash has no other special meaning inside templates.
- Placeholders are `{name}` and `{}` (see Section 5.2). To include literal braces, write `{{` or `}}`.

## 1. Philosophy

VVM is a language for writing programs that run **inside** a modern agentic tool (Claude Code, OpenCode, Amp, etc.). The “interpreter” is the AI session itself: when you provide a `.vvm` program and this spec, the session simulates the VVM virtual machine and executes the program.

VVM is designed for **human authors**, but with semantics that are executable and portable across tools.

Key design principles:
- **Minimal syntax**: indentation blocks, familiar control flow, minimal ceremony.
- **Explicit AI boundary**: LLM invocations are syntactically explicit (`@agent `prompt`(...)`).
- **Eager and deterministic**: programs run top-to-bottom; parallelism is explicit (e.g. `pmap`).
- **Semantic control flow**: branching can use semantic predicates and semantic pattern matching (the VM judges meaning, not only booleans).
- **Portable and conservative**: if uncertain, the VM should prefer safe defaults (avoid claiming success/quality without support).

---

## 2. At a Glance

### 2.1 Minimal research → synthesize

```vvm
import "web-search" from "github:example/skills"

agent researcher(model="sonnet", skills=["web-search"])
agent analyst(model="sonnet")
agent writer(model="opus")

topic = "quantum computing"

research = @researcher `Find 8-12 recent papers on {topic}. Return a bulleted list with links.`(topic)
tech = @analyst `Technical analysis of the papers.`(research)
biz = @analyst `Business analysis and market implications.`(research)

report = @writer `Write an executive summary combining the technical and business analysis.`([tech, biz])

export report
```

This executes sequentially by default. Use `pmap` (or other explicit helpers) when you know work is safely parallel.

### 2.2 Less boilerplate input passing (implicit `it`)

```vvm
agent writer(model="opus")
agent critic(model="sonnet")

draft = @writer `Draft the report.`()

match draft:
  case ?`needs_work`:
    critique = @critic `Critique and suggest concrete fixes.`()   # uses implicit input: it == draft
    draft = @writer `Revise using critique.`([draft, critique])   # overrides input explicitly
  case ?`ready`:
    pass
  case _:
    draft = @writer `Make it clearer and more structured.`()

export draft
```

Inside `match draft:`, the VM binds `it = draft` for each arm, so `@critic ... ()` defaults to the matched value.

---

## 3. Core Concepts

### 3.1 Values

VVM is dynamically typed. Values flow between agent calls, control flow, and the standard library.

#### 3.1.1 Literal syntax (portable)

- Unit: `()`
- Boolean: `true | false`
- Number: `123`, `3.14` (portable minimum: integers; floats optional)
- String: `"..."` and multiline `"""..."""`
- List: `[v1, v2, ...]` (trailing comma allowed)
- Object: `{ key: value, ... }` where `key` is an identifier or string (trailing comma allowed)
- Error (conventional): `{ error: { kind: "...", message: "...", data?: {...} } }`

#### 3.1.2 Object keys

- Object literal keys are either identifiers (`{ a: 1 }`) or strings (`{ "a": 1 }`).
- If an identifier is used as a key, it is treated as a string key with that spelling.

#### 3.1.3 Equality and truthiness

- `if`/`while` conditions require a boolean `true` or `false`. VVM does not have truthiness; other values are an error (Section 8.1).
- Equality operators:
  - `==` and `!=` are defined for `()`, booleans, numbers, strings, lists, and objects using structural equality.
  - If operand types differ, `==` is `false` and `!=` is `true`.
  - Comparing functions or agents raises a `thrown` error.
- Ordering operators (`<`, `<=`, `>`, `>=`) are defined only for numbers; other uses raise a `thrown` error.

### 3.2 Errors (value-based)

Errors are values. VVM distinguishes:
- **Error values**: ordinary values that represent failure (handled with `match`)
- **Raised errors**: control-flow abort via `raise` (handled with `try/except`)

#### 3.2.1 Error value recognition (normative)

A value is an error value iff it is an object with a top-level `error` field whose value is an object.

Runtimes MUST NOT treat error values as exceptions. They only affect control flow if your program branches on them.

Common `kind` values (non-exhaustive):
- `spawn_failed`
- `timeout`
- `rejected` (policy/permissions/host constraints)
- `constraint_violation`
- `cancelled`
- `thrown`

`thrown` is used for explicit `raise` and for runtime type errors in stdlib helpers. Canonical shape:

```vvm
{ error: { kind: "thrown", message: "..." } }
```

Error handling is typically done with `match`:

```vvm
# assumes @backup is defined
match resp:
  case error(kind="timeout"):
    resp = @backup `Use cached response.`(request)
  case error(_):
    resp = @backup `Try a different provider.`(request)
  case _:
    pass
```

### 3.3 Agents

Agents are named configuration templates. They live in an **agent namespace**, referenced with `@name` in calls.

#### 3.3.1 Definition syntax

```vvm
agent researcher(
  model="sonnet",
  skills=["web-search"],
  prompt="thorough, cite sources",
  permissions=perm(network="allow", read=["**/*"], write=[], bash="deny"),
)
```

#### 3.3.2 Standard agent keys (portable)

Agent config keys are host/tooling-dependent, but VVM standardizes a small portable subset:
- `model`: model tier/name
- `prompt`: system/persona guidance (agent-level)
- `skills`: skill identifiers (strings; see Section 11.2)
- `permissions`: sandbox permissions (see `perm(...)`)

Terminology:
- `agent(..., prompt="...")` is the agent’s **system/policy** prompt.
- The backtick template in `@agent `...`(...)` is the call’s **task prompt**.

Other agent config keys are host-defined. VVM intentionally does not standardize a `tools` key in MVP; prefer `skills` + `permissions` for portability.

For readability, parenthesized argument lists may span multiple lines and may include trailing commas (Python style).

#### 3.3.3 Permissions (portable)

`permissions` is an object (often created with `perm(...)`) that the runtime passes to the host tool so the subagent is sandboxed.

Portable permission keys and value shapes:
- `read`, `write`, `execute`: lists of glob patterns (empty list means no access)
- `bash`, `network`: `"allow" | "deny" | "prompt"`

If the host tool cannot enforce a permission rule, the runtime SHOULD treat attempted access as rejected and return an error value of kind `rejected` rather than silently allowing it.

#### 3.3.4 Skills (portable)

`skills=[...]` is an array of skill names (strings). Skills are declared via module-scope skill imports (Section 11.2).

The runtime passes the selected skills to the host tool. The meaning of a skill is host-defined (often: tool integrations + conventions).

#### 3.3.5 Validation (portable MVP)

- Agent declarations should be configuration only: values must be literals/lists/objects (and helper constructors like `perm(...)`).
- Agent declarations must not contain agent calls; if you need runtime-dependent configuration, derive an agent at the call site with `.with(...)` or use an inline agent literal.
- If `skills=[...]` is present, each element should be a string skill name. Empty `skills=[]` should warn.
- If an agent references a skill name that is not imported in the same module, the runtime should warn (best-effort).

#### Derived agents (`.with(...)`)

`@agent.with(...)` creates a derived agent with overrides:

```vvm
summary = @researcher.with(model="haiku", prompt="brief") `Summarize key points.`(research)
```

Merge rules:
- scalars override
- objects shallow-merge
- lists replace (no implicit concatenation)

#### Inline agent literals

```vvm
answer = @{model="haiku", prompt="brief"} `Answer concisely.`(question)
```

Inline agent literals use `key=value` (like function arguments), not object-literal `key: value`.

### 3.4 The AI Boundary (Agent Calls)

Agent calls are the boundary between “normal evaluation” and “delegate work to an LLM subagent”. They are the only construct that requires spawning a subagent.

#### 3.4.1 Syntax

The core executable primitive is an **agent call**:

```
@agent `task template`(input?, retry=..., timeout=..., backoff=..., name=...)
```

Evaluating an agent call expression executes the call immediately (spawns a subagent) and yields a concrete value (or an error value).

#### 3.4.2 Execution semantics (portable)

To evaluate `@agent `template`(...)`:
1. Resolve the agent reference (`@name`, `@name.with(...)`, or inline `@{...}`) to an agent configuration object
2. Determine the call input value: the first positional argument if present, otherwise the current `it`
3. Evaluate option expressions (`retry`, `timeout`, `backoff`, `name`, plus any unknown option values)
4. Render the template to a task prompt string (Section 5), using `{}` as the call input and `{name}` from the current environment
5. Spawn the subagent with (agent config, task prompt string, structured input value) and wait for completion
6. If the host reports success, return the subagent’s output as a VVM value (portable MVP: a string). If the host reports failure, return an error value (Section 3.2).

#### 3.4.3 Result value (portable MVP)

For portability (Prose-like), a successful agent call yields a **string**: the subagent’s final response text.

Notes:
- Hosts/tools may provide richer result objects; runtimes SHOULD extract the human-visible final output text.
- VVM 0.0.1 does not automatically parse JSON or VVM literals out of that text. If you want structured outputs, ask the agent to return a structured format and treat it as text (future versions may add parsing helpers).

#### Required delimiter

Agent calls MUST use parentheses `(...)` (even if empty) to avoid ambiguity and keep the surface predictable for humans and for the VM.

#### Input is the first positional argument

The first positional argument is the **structured input context**.

Examples:

```vvm
@writer `Write a summary.`()            # uses implicit input `it`
@writer `Write a summary.`(doc)         # explicit input
@writer `Compare.`([a, b])              # multiple inputs (list)
@writer `Explain.`(pack(a=a, b=b))      # named fan-in (object)
@writer `Start fresh.`(())              # explicit empty context
```

You can always override the implicit input by passing an explicit first argument.

Note: `@agent `...`()`` means “use `it`”, not “empty input”. Use `@agent `...`(())` to explicitly pass empty input.

#### Call options (portable subset)

Call options are keyword arguments after the (optional) first positional input:
- `retry=<int>`: retry on `spawn_failed`, `timeout`, and transient `rejected` best-effort
- `backoff="fixed" | "exponential"`: optional retry backoff hint
- `timeout="<duration>"`: e.g. `"30s"`, `"5m"`
- `name="<string>"`: a stable label for logs/tracing

Runtimes may support additional options, but should ignore unknown keys conservatively rather than reinterpret them.

`retry=` semantics (portable MVP):
- `retry=n` means “try the call up to `1 + n` times”.
- Retries occur only if the previous attempt returned an error value of kind `spawn_failed`, `timeout`, or `rejected`.
- Each retry reuses the same agent configuration, rendered prompt, and input value.
- The final result is the first non-error value, or the last error value if all attempts fail.

`timeout=` semantics (portable MVP):
- If an attempt exceeds `timeout`, it returns an error value of kind `timeout` (and may be retried if `retry` is set).

Examples:

```vvm
with input request:
  # assumes @api is defined
  resp = @api `Call service.`(retry=3, backoff="exponential", timeout="30s")
```

#### Input passing (structured, not string-based)

Semantically, an agent call has **two channels**:
1. **Prompt text**: the rendered template (after interpolation)
2. **Input value**: the call input (explicit first argument, or implicit `it`)

The runtime MUST pass the input value to the subagent as **structured context** if the host tool supports it (e.g. a dedicated context parameter or a separate input message). In that case, the VM should treat prompt and input as distinct—do not “smuggle” input by interpolating it into the task template.

This spec describes how the subagent should conceptually receive the input, not a requirement that the runtime literally concatenates strings.

#### Text encoding fallback (interoperability)

If the host tool only supports a single text prompt (no separate context channel), the VM MUST encode the input value into the text using a clear delimiter:

Canonical encoding:

```text
<rendered prompt>

Input:
---
<serialized value>
---
```

Size-based serialization guidance:
- `< 2k chars`: inject verbatim
- `2k–8k`: summarize + include key excerpts
- `> 8k`: extract essentials only + include stable references/handles if available

If the call input is `()`, the VM may omit the `Input:` section entirely.

#### Why this exists

Even on tools with subagents, the subagent ultimately sees tokens. A portable spec needs a canonical, tool-agnostic representation of “the input” (with summarization rules) so different runtimes converge on similar behavior.

#### Canonical value serialization (portable)

When the VM needs to serialize a value to text (for fallback input encoding or for interpolation summaries), it should use a JSON-like representation:
- Lists serialize as JSON arrays.
- Objects serialize as JSON objects with string keys.
- Object keys should be serialized in a stable order (lexicographic by key) to reduce nondeterminism across runtimes.
- Error values serialize like any other object.

---

## 4. Implicit Input (`it`) and Context Passing

VVM keeps context passing explicit (the first call argument), but provides a convenience binding: `it`.

### 4.1 What is `it`?

`it` is an implicit, lexically-scoped value that acts as the **default input** for:
- agent calls with no positional input: `@a `...`()`
- semantic predicates with no input (see `?` below)

At top-level, `it` starts as `()`.

### 4.2 Setting `it` with `with input`

```vvm
with input draft:
  critique = @critic `Critique.`()
  revised = @writer `Revise using critique.`([draft, critique])
```

Inside the block, `it = draft`. The input expression is evaluated once at block entry. You can still override per call by passing an explicit first argument.

### 4.3 `match` also sets `it`

In `match value:`, each arm runs with `it = value`.

### 4.4 Interpolation is not context passing

`{name}` interpolation inserts a summary into the prompt text. It is not a substitute for structured input.

Prefer passing structured input as the first argument in `(...)` for large/structured values.

### 4.5 Names, Scope, and Mutability (Normative)

VVM follows Python-like execution and scoping rules, with one special-case: `it`.

#### Variables

- `name = expr` creates or updates a variable binding in the **current function scope**.
- There is no `let`/`const` in MVP; variables are mutable by reassignment.
- Blocks (`if`, `while`, `for`, `match`, `choose`, `try`) do **not** introduce a new variable scope (like Python). Assignments inside these blocks affect the surrounding function scope.
- Each `def` has a local scope. The set of **local names** for a function is:
  - its parameter names
  - any name that appears as an assignment/binding target anywhere in the function body:
    - `name = expr`
    - `for name in items:`
    - `except as name:`
    - `choose ... as name:`
  (This is Python-like: assignment anywhere makes the name local.)
- Evaluating an identifier `name` inside a function:
  1. If `name` is in the function’s local-name set:
     - if `name` is currently bound, return its value
     - otherwise, raise a `thrown` error (“unbound local”)
  2. Otherwise, resolve `name` in module scope (including imported values and hoisted `def`s).
  3. Otherwise, resolve `name` in the standard library.
  4. Otherwise, raise a `thrown` error (“unbound name”).

#### The special binding `it`

- `it` is **lexically scoped** and is pushed/popped by `with input ...:` and by `match`/`choose` arms/options.
- After leaving a `with input` block or a `case`/`option` body, `it` is restored to its previous value.
- Ordinary assignments cannot rebind `it` directly.
- `it` MUST NOT be used as a user-defined name (variable/function/agent/parameter/import alias).

#### Namespaces

- Agents live in an agent namespace and are referenced with `@name` (or `@{...}` inline).
- Functions and variables share a namespace; `f(...)` calls `f` if it is a function, otherwise the VM raises a `thrown` error.

---

## 5. Prompts, Templates, and Interpolation

### 5.1 Template literal: `` `...` ``

VVM uses backtick templates for prompts and semantic criteria:

```vvm
topic = "AI safety"
@researcher `Research {topic}.`(topic)
```

Templates can be multiline. To include a literal backtick, escape as ``\` ``.

Templates are used in:
- agent calls (`@agent `...``)
- semantic predicates (`?`...``) including `require ?`...`` and `choose ... by ?`...``

### 5.2 Placeholders

Templates support two placeholder forms:
- `{}`: the template's **primary input**
- `{name}`: a lookup of an in-scope binding by identifier

Primary input depends on where the template appears:
- agent call template: the call input (explicit first positional argument, or `it` if omitted)
- semantic predicate template: the predicate input (explicit argument, or `it` if omitted); for `require` and `choose by`, this is always `it`

#### Escapes

- To write a literal `{` or `}` in a template, escape by doubling: `{{` and `}}`.
- To write a literal `{}` sequence, use `{{}}`.

#### Template parsing (portable)

The VM MUST parse templates left-to-right:
- `{{` becomes a literal `{`
- `}}` becomes a literal `}`
- `{}` becomes the primary-input placeholder
- `{name}` becomes a name placeholder where `name` matches the identifier regex

Any other unescaped `{` or `}` is a validation error.

#### Placeholder validation (portable MVP)

To catch typos early (Prose-like), runtimes MUST validate every `{name}` placeholder:
- `name` MUST be a valid identifier and MUST NOT be a reserved keyword.
- If `name` does not refer to any statically-known binding and is not a stdlib identifier, it is a validation error.
  - In a `def`, “statically-known” means: a parameter name, or a name in the function’s local-name set (Section 4.5), or an imported/hoisted module value (`from ... import name`, `def name(...)`).
  - At module top-level, “statically-known” means: an imported/hoisted module value, or a name assigned somewhere in the module.

This validation is intentionally conservative and does not prove “assigned before use”.

#### Placeholder resolution at runtime (portable)

When rendering a template:
- `{}` uses the primary input value.
- `{name}` is resolved using the normal identifier lookup rules (Section 4.5).
- If `{name}` is not bound at render time, the VM raises a `thrown` error.

If template rendering raises, the enclosing operation raises and does not proceed:
- In an agent call, the VM MUST NOT spawn the subagent.
- In a semantic predicate (`?`), predicate evaluation raises.

### 5.3 Formatting rules (portable)

When interpolating values into template text:
- short strings are inserted verbatim
- long strings/lists/objects are summarized to 1–3 lines and include a stable reference label like `[see input]`

The full value should be provided via structured input whenever possible.

---

## 6. Semantic Predicates (`?`)

VVM has a semantic predicate form evaluated **locally by the VM** (no subagent):

```vvm
ok = ?`high_quality`(draft)
```

Syntax:
- `?`template`` uses implicit input `it`
- `?`template``(input)` uses explicit input

Return value:
- Semantic predicates normally evaluate to a boolean `true` or `false`.
- If evaluation fails (e.g. template rendering fails), the predicate raises a `thrown` error.

Purity rule (portable):
- Predicate evaluation MUST NOT call tools, read files, or spawn subagents. It is a local judgment by the VM.

Examples:

```vvm
with input draft:
  if ?`ready to publish`:
    pass
```

Portability rule: if uncertain, return `false`.

Template rendering:
- The predicate template is rendered using the same placeholder rules as task templates (`{name}`, `{}`), then evaluated semantically.
- The predicate input is evaluated before semantic judgment.

---

## 7. Semantic Pattern Matching (`match`)

`match` is VVM’s primary semantic control flow.

```vvm
# assumes @publisher, @backup, @worker are defined
match result:
  case ?`ready and high_quality`:
    publish = @publisher `Publish.`()
  case error(kind="timeout"):
    result = @backup `Use cached value.`(request)
  case _:
    result = @worker `Improve and retry.`()
```

### 7.1 Match semantics

1. Evaluate the scrutinee (`result`) to a value and bind `it` to it for case selection/execution
2. Check cases top-to-bottom
   - If evaluating a semantic-predicate `case` pattern raises, the `match` statement raises.
3. Execute only the first matching case body

Non-chosen cases MUST NOT be executed.

### 7.2 Patterns (portable MVP)

Supported pattern forms:
- `_` wildcard
- `error(_)` any error
- `error(kind="timeout")` error kind match
- semantic predicates: `?` + template literal (evaluated against the scrutinee via implicit `it`)

In a `match`, each case body runs with `it = <scrutinee>`, so semantic cases typically omit the input:

```vvm
match draft:
  case ?`needs_work`:
    draft = @writer `Revise.`()
  case _:
    pass
```

The VM evaluates `?` predicates semantically and locally, using `it` (the scrutinee) as context.

For portability and clarity, `case ?`template`(input):` is not allowed. If you want to predicate on a different value, write `match` on that value or use an `if` inside the case body.

---

## 8. Control Flow

### 8.1 `if / elif / else`

`if` conditions are boolean expressions. Semantic conditions are expressed via `?`:

Boolean operators:
- `and` / `or` are short-circuiting.
- `not` negates a boolean.

In MVP:
- Arithmetic operators `+` and `-` are defined only for numbers; other uses raise a `thrown` error.
- Ordering operators (`<`, `<=`, `>`, `>=`) are defined only for numbers; other uses raise a `thrown` error.
- Equality operators (`==`, `!=`) follow Section 3.1.3.

In `if`/`while`, the condition expression is evaluated and must produce a boolean; otherwise the VM raises a `thrown` error.

```vvm
# assumes @deploy and @fixer are defined
if ?`the code is production ready`(code):
  ship = @deploy `Deploy.`(code)
else:
  code = @fixer `Improve the code.`(code)
```

### 8.2 `while`

```vvm
# assumes @critic and @writer are defined
i = 0
while i < 3 and not ?`ready`(draft):
  critique = @critic `Critique.`(draft)
  draft = @writer `Revise.`([draft, critique])
  i = i + 1
```

Semantics (MVP):
- Evaluate the condition expression before each iteration; it MUST produce a boolean, otherwise raise a `thrown` error.
- If the condition is `false`, exit the loop.
- If the condition is `true`, execute the loop body, then repeat.
- `break` exits the nearest enclosing loop; `continue` skips to the next iteration.

### 8.3 `for`

```vvm
# assumes @worker is defined
for item in items:
  with input item:
    out = @worker `Process this.`()
```

VVM also provides collection helpers in the standard library (`map`, `pmap`, `filter`, `reduce`) to reduce boilerplate.

Semantics (MVP):
- The `items` expression is evaluated and must be a list; otherwise the VM raises a `thrown` error.
- The loop variable (`item`) is assigned for each iteration in the surrounding function scope (like Python).
- `break` and `continue` affect the nearest enclosing loop.

### 8.4 `pass`, `break`, `continue`

- `pass` is a no-op.
- `break` exits the nearest enclosing loop.
- `continue` skips to the next loop iteration.

---

## 9. Constraints (`constrain`) and Requirements (`require`)

Constraints are a standard way to turn fuzzy quality requirements into explicit, portable checks.

### 9.1 `constrain <name>(...)`

`constrain` attaches requirements to an existing binding and rewrites it to an error on violation.

```vvm
draft = @writer `Draft a report with citations.`(research)

constrain draft(attempts=3, time="10m"):
  require ?`citations >= 5`
  require ?`no hallucinations`
  require ?`reading level: executive`
```

Semantics:
1. Evaluate `draft` to a value `v`
2. Evaluate each `require ?`template`` as a semantic predicate against `it = v`; `it` is restored after constraint evaluation
   - If any `require` evaluation raises, the `constrain` statement raises.
3. If all pass: rebind `draft = v`
4. Else: rebind `draft` to:

Portability rule: if a requirement is uncertain, treat it as violated.

```vvm
{
  error: {
    kind: "constraint_violation",
    message: "Constraints not satisfied",
    data: {
      value: <original_value>,
      violations: [...],
      requirements: [...]
    }
  }
}
```

### 9.2 Resource bounds (best-effort)

`constrain name(...)` may include:
- `attempts=<int>`: guidance for refinement loops
- `time="<duration>"`: time budget hint
- `budget=<number>`: cost/token budget hint (tooling-dependent)

These do not automatically retry; they provide machine-readable bounds for helper loops like `refine`.

---

## 10. Choice (`choose`)

`choose` selects one option among alternatives, based on a semantic criterion. It is like `match`, but comparative.

```vvm
# assumes @planner is defined
choose analysis by ?`best approach given the constraints` as choice:
  option "quick":
    plan = @planner `Make a minimal plan.`()
  option "thorough":
    plan = @planner `Make a thorough plan with risks.`()

export choice
export plan
```

Semantics:
1. Evaluate the scrutinee (`analysis`) to a value and bind `it` to it for selection/execution
2. Evaluate the semantic predicate `?`...`` against `it`
   - If evaluation raises, the `choose` statement raises.
3. Select an option label using the criterion, conservatively, **without executing any option bodies**
4. Assign the chosen option label (a string) to the `as <name>` variable (`choice` in this example)
5. Execute only the chosen option body

Within each option body, `it` remains bound to the scrutinee.

Tie-break rule: if multiple options are equally plausible, choose the first option in source order.

Purity rule (portable):
- Option selection MUST NOT call tools, read files, or spawn subagents. It is a local judgment by the VM.

---

## 11. Functions, Skills, and Modules

### 11.1 `def`

Functions are reusable subgraphs and can call agents.

Semantics (portable MVP):
- Arguments are evaluated at call time and passed by value.
- A function body executes sequentially like top-level code.
- `return expr` returns the value of `expr`.
- `return` (without a value) returns `()`.
- If control reaches the end of the function, it returns `()`.
- The implicit input `it` is inherited from the caller (and can be overridden with `with input ...:` inside the function).
- Functions are first-class values: referencing a function name yields a callable that can be passed to stdlib helpers like `map`/`pmap`.
- Top-level `def` declarations are hoisted at module load time (so functions may be called before their textual definition).

Function call argument binding (portable MVP):
- Positional arguments bind left-to-right to parameters.
- Keyword arguments bind by parameter name.
- The VM raises a `thrown` error if:
  - too many positional arguments are provided,
  - a keyword does not match any parameter,
  - the same parameter is provided twice (positional + keyword, or duplicate keyword),
  - a required parameter is missing.

```vvm
# assumes @researcher and @analyst are defined
def deep_research(topic):
  papers = @researcher `Find papers on {topic}.`(topic)
  return @analyst `Extract key insights.`(papers)
```

### 11.2 Skill imports

Skills are host-defined extensions (often tool integrations + conventions) that can be assigned to agents via `skills=[...]`.

VVM uses a Prose-like skill import statement:

```vvm
import "web-search" from "github:anthropic/skills"
import "summarizer" from "npm:@example/summarizer"
import "file-writer" from "./local-skills/file-writer"
```

Supported source forms (portable MVP):
- GitHub: `github:user/repo`
- NPM: `npm:package`
- Local path: `./path` or `../path`

Semantics (portable MVP):
- Skill imports are **module-scope only** and processed before agent calls execute.
- `import "<skill-name>" from "<source>"` registers `<skill-name>` in the module’s imported-skill set.
- Duplicate imports of the same `<skill-name>` within a module are a validation error.
- If multiple modules in the same program import the same `<skill-name>`, they must agree on `<source>`; otherwise it is a validation error.
- If `<source>` has an unknown format, the runtime should warn (best-effort) and still register the skill name (the host may still be able to resolve it).
- If an agent’s `skills=[...]` references a skill name that is not imported in the same module, the runtime should warn (best-effort). The program may still run if the host provides that skill by default.

Skill imports do not introduce value bindings (there is no identifier created). They exist to make dependencies explicit and portable.

### 11.3 Module imports

```vvm
from "./lib/research.vvm" import deep_research
from "./lib/research.vvm" import @researcher as researcher_agent
```

Module imports are processed before execution.

Semantics (portable MVP):
- If the import string starts with `./` or `../`, it is resolved relative to the directory of the importing module file (not the process CWD).
- Otherwise, the import string is interpreted as a host-defined module identifier (future: registries); MVP runtimes may restrict this to local file paths only.
- After resolution, the runtime computes a canonical module identity (lexically normalize `.`/`..` segments). Importing the same canonical module multiple times refers to the same module.
- A module’s exports are declared by `export ...` statements in that module.
- Importing `name` imports a value/function export into the value namespace.
- Importing `@name` imports an agent export into the agent namespace (accessible as `@alias`).
- If the referenced module or exported name cannot be resolved, it is a validation error.

#### Module resolution procedure (normative)

When encountering `from "path" import ...`:

1. **Compute resolved path**: If `path` starts with `./` or `../`, resolve relative to the directory containing the importing file. Otherwise, treat as host-defined identifier.

2. **Verify file exists**: The runtime MUST use `test -f <resolved_path>` (via Bash tool) to verify the file exists. The runtime MUST NOT assume a file exists without verification.

3. **On file not found**: If `test -f` returns non-zero (file does not exist), emit error E090 with message: `Module not found: {resolved_path}`. Halt validation.

4. **Read and parse module**: If file exists, use the Read tool to load the file contents, then parse as a VVM module. Syntax errors are reported with the imported file's path.

5. **Resolve exports**: After parsing, verify the requested export (`name` or `@name`) exists in the module's export list. If not found, emit E090 with message: `Export '{name}' not found in module '{path}'`.

### 11.4 Exports

```vvm
export report
export deep_research
export @researcher
```

Exports define the program’s public API. For a script-style program, a runtime should:
- execute top-level control flow (the script)
- at the end of execution, return the exported **values** (exported agents are configuration, not run targets)

Export declarations are hoisted at module load time. Exporting the same name multiple times is allowed and has no additional effect.

---

## 12. Execution Model (Eager, Sequential)

VVM uses **strict (eager) evaluation**. Agent calls block until they return a value (or an error value). There are no futures/tasks in VVM 0.3.

### 12.1 Program order

- After imports and hoisted declarations are processed (see Compilation and Validation), top-level statements execute in source order.
- Each statement fully completes before the next statement begins.
- Control flow bodies (`if`, `while`, `for`, `match`, `choose`, `try`) execute sequentially.

### 12.2 Expression evaluation order (portable)

To avoid ambiguity when expressions contain agent calls, VVM defines a left-to-right order:

- `a and b` / `a or b` evaluate the left operand first and short-circuit.
- List literals evaluate elements left-to-right.
- Object literals evaluate values left-to-right in source order.
- Function calls `f(...)` evaluate:
  1. `f`
  2. positional argument expressions left-to-right
  3. keyword argument value expressions left-to-right as written
- Agent calls `@agent `...`(...)` evaluate:
  1. the agent reference (including `.with(...)` override expressions)
  2. the primary input (first positional argument), or else read `it`
  3. option argument values (`retry`, `timeout`, `backoff`, `name`, plus any unknown options)
  4. render the task template (using `{}` as the primary input and `{name}` lookups from the current environment)
  5. spawn the subagent and wait for completion

### 12.3 Non-chosen branches

Agent calls may have side effects. Therefore:
- In `match`, only the first matching `case` body executes; all other case bodies MUST NOT be executed.
- In `choose`, option bodies MUST NOT be executed during selection; only the chosen option body executes.

### 12.4 Parallelism (explicit only)

The core language is sequential. The runtime MUST NOT infer parallelism between independent agent calls.

Some stdlib helpers (currently `pmap`) may evaluate work concurrently as an explicit opt-in. Programs that use such helpers should only parallelize independent work and must tolerate interleaving.

---

## 13. Error Handling

VVM primarily uses **error values** + `match` for recovery. It also supports `raise` and `try/except/finally` as an escape hatch for aborting control flow.

### 13.1 Two failure channels

VVM has two distinct failure mechanisms:

1. **Error values** (Section 3.2): returned like any other value (e.g. an agent call result). These do not change control flow automatically.
2. **Raised errors** (`raise`): abort the current control-flow path until caught by `try/except`.

In addition to explicit `raise`, the VM MAY raise `thrown` errors for runtime failures (e.g. unbound names, type errors, malformed templates). These raised errors are catchable by `try/except` the same way.

Guidance:
- Prefer **error values + `match`** for expected failures (timeouts, retries, policy rejections).
- Use **`raise`** for “this path cannot continue” inside helper functions or to enforce invariants.

### 13.2 `raise`

Syntax:
- `raise`
- `raise "message"`

Semantics (portable MVP):
- `raise "message"` constructs an error value `{ error: { kind: "thrown", message: <message> } }` and raises it as control flow.
- `raise` (no message):
  - inside an `except as err:` block: re-raises the currently caught error value (the value bound to `err`)
  - otherwise: raises a new `thrown` error with an empty message
- If there is an enclosing `try/except`, control transfers to its `except` block and binds the error value to the `except as <name>` variable.
- If there is no enclosing `try/except`, the program terminates with that thrown error value.

### 13.3 `try / except / finally`

Syntax (MVP grammar):

```vvm
try:
  ...
except as err:
  ...
finally:
  ...
```

Semantics (portable MVP):
- `except` and `finally` are each optional, but at least one MUST be present.
- The `try` block executes.
- If a raised error occurs inside the `try` block:
  - if an `except as err:` block is present, execution jumps to it and binds `err` to the raised error value
  - otherwise, the raised error propagates outward (after running `finally` if present)
- The `finally` block (if present) executes after the `try`/`except` path completes, whether it completed normally or via a raised error.
- If the `finally` block raises, that raised error propagates outward (it overrides any previous raised error from the `try`/`except` path).

`try/except` only catches **raised** errors. It does not automatically catch ordinary error values; use `match` for those.

```vvm
# assumes @backup and @logger are defined
try:
  if ?`request is invalid`(request):
    raise "Invalid request"
except as err:
  resp = @backup `Recover from error.`(err)
finally:
  @logger `Record completion.`(())
```

Rules:
- `raise "msg"` aborts the current block unless caught; the caught value is an error object of kind `thrown`.
- `raise` (without a message) re-raises the currently caught error inside an `except as err:` block; otherwise it raises a new `thrown` error with an empty message.
- `except as err:` catches only raised errors (not ordinary error values returned by agent calls).
- Prefer `match` for ordinary recovery from agent-call failures.
- An uncaught `raise` terminates program execution; if the runtime returns a script result, it should return the thrown error value.

---

## 14. Standard Library (Normative)

VVM ships with a small, portable stdlib. Runtimes may implement these as intrinsics as long as behavior matches.

Stdlib identifiers are in scope in every module by default (no import required).

### 14.0 `perm(...)` and `range(...)` (portable helpers)

`perm(...)` is a convenience constructor for permission objects used in agent configs:

```vvm
permissions = perm(
  read=["src/**", "*.md"],
  write=["docs/**"],
  execute=[],
  bash="deny",
  network="prompt",
)
```

Portable permission keys and value shapes:
- `read`, `write`, `execute`: lists of glob patterns (empty list means no access)
- `bash`, `network`: `"allow" | "deny" | "prompt"`

Defaults (portable):
- `read=[]`, `write=[]`, `execute=[]`
- `bash="deny"`, `network="deny"`

`range(n)` produces the list `[0, 1, ..., n-1]` (integers).

### 14.1 `pack(...)`

`pack` builds objects for named fan-in:

```vvm
ctx = pack(research, analysis, topic=topic)
```

Semantics:
- `pack(x)` (positional) uses the variable name as the key: `{ "x": <value of x> }`
- `pack(k=v)` (keyword) uses the provided key

Validation:
- Positional arguments must be simple identifiers (e.g. `pack(research)`). Use keywords for computed expressions (e.g. `pack(result=deep_research(topic))`).

### 14.2 `refine(...)` (expressible with loops)

`refine` is a conventional agentic improvement loop. It is specified as library code, not a primitive.

Signature:

```text
refine(seed, max, done, step) -> value
```

- `seed`: initial candidate value
- `max`: max iterations
- `done(current, i) -> bool`: termination predicate (often uses `?`)
- `step(current, i) -> value`: produces the next candidate (often uses agents)

Reference implementation (informative VVM):

```vvm
def refine(seed, max, done, step):
  current = seed
  for i in range(max):
    if done(current, i):
      return current
    current = step(current, i)
  return current
```

### 14.3 Collection helpers

The collection helpers operate on lists and call user functions eagerly. Any agent calls inside `f`/`pred` run immediately.

#### `map(items, f)`

- Evaluates `items` and requires it to be a list.
- For each item (in order):
  - evaluate `f(item)`
  - if evaluation raises, propagate the raised error
  - if the result is an error value, return it immediately (fail-fast)
- Returns the list of results.

#### `pmap(items, f)`

Like `map`, but the runtime MAY evaluate `f(item)` for multiple items concurrently, and MUST return results in the original item order.

Portability notes:
- Runtimes may implement `pmap` sequentially.
- If any invocation raises, `pmap` raises (recommended: the first raised error in input order).
- If any invocation returns an error value, `pmap` returns the first such error in input order (even if other invocations also errored).
- Programs should only use `pmap` when invocations are independent and side effects are safe to interleave.

#### `filter(items, pred)`

- Evaluates `items` and requires it to be a list.
- For each item (in order):
  - evaluate `pred(item)`
  - if evaluation raises, propagate the raised error
  - if the result is an error value, return it immediately (fail-fast)
  - require the result to be a boolean
  - keep the item if `true`
- Returns the filtered list (preserving relative order).

#### `reduce(items, f, init=...)`

- Evaluates `items` and requires it to be a list.
- If `init` is provided, it becomes the initial accumulator; otherwise the first item is used (error on empty list).
- For each remaining item (in order):
  - evaluate `f(acc, item)`
  - if evaluation raises, propagate the raised error
  - if the result is an error value, return it immediately (fail-fast)
  - set `acc` to that result
- Returns `acc`.

#### Error semantics (portable)

- If `items` is not a list, raise a `thrown` error.
- If `pred(...)` does not evaluate to a boolean, raise a `thrown` error.

To get “continue on error” behavior, handle errors inside `f`/`pred` with `match`.

---

## 15. Compilation and Validation (Normative)

This section defines what it means for a runtime to “compile” and “run” VVM without ambiguity.

### 15.1 Phases

1. **Parse**
   - Tokenize, respecting indentation (`INDENT`/`DEDENT`) and comments.
   - Parse into an AST according to the Grammar.

2. **Load module imports and skill imports**
  - Resolve `from "path" import ...` recursively.
  - Relative paths (`./`, `../`) are resolved relative to the importing file’s directory.
  - Each imported module is loaded and executed exactly once (by canonical module identity) before the importing module’s top-level statements execute.
  - As each module is loaded, collect its module-scope skill imports (`import "skill" from "source"`) and build a program-wide skill registry mapping `skill-name -> source`.
  - If a later module imports the same skill name from a different source, it is a validation error.
  - Cyclic imports are a validation error.

3. **Collect module declarations (hoisted)**
   - Collect all top-level `import "skill" from "source"`, `agent ...`, `def ...`, and `export ...` declarations into the module environment before running imperative statements.
   - Duplicate agent names or duplicate function names are validation errors.
   - `import ... from ...`, `agent`, `def`, `export`, and `from ... import ...` are **module-scope only**; using them inside blocks or inside a `def` is a validation error.
   - Validate template literals (Section 5.2): malformed placeholders are errors, and unknown placeholder names are errors.

4. **Execute the script**
   - Execute all remaining top-level statements in source order.
   - Statement execution is sequential.

5. **Materialize exports**
   - The module’s public API is the set of exported names (values/functions/agents).
   - If the program is run as a script, the runtime should return exported **values**.
   - Exported agents are configuration objects and are not run targets.

### 15.2 Diagnostics (portable MVP)

VVM runtimes report:
- **Errors**: block execution (do not run the program)
- **Warnings**: non-blocking guidance (the program may still run)

Runtimes SHOULD report a location (line/column) when practical.

#### 15.2.1 Reserved keywords

These identifiers MUST NOT be used as user-defined names (variables, functions, agents, parameters, import aliases):

`import`, `from`, `as`, `export`, `agent`, `def`, `return`, `match`, `case`, `choose`, `by`, `option`, `constrain`, `require`, `with`, `input`, `if`, `elif`, `else`, `while`, `for`, `in`, `try`, `except`, `finally`, `raise`, `pass`, `break`, `continue`, `and`, `or`, `not`, `it`, `true`, `false`, `error`

#### 15.2.2 Error codes (blocking)

| Code  | Description |
| ----- | ----------- |
| E001  | Syntax error (unexpected token / invalid form) |
| E002  | Inconsistent indentation (bad INDENT/DEDENT) |
| E003  | Unterminated string literal |
| E004  | Unterminated template literal |
| E005  | Unknown escape sequence in string literal |
| E010  | Reserved keyword used as identifier |
| E020  | Duplicate agent definition |
| E021  | Duplicate function definition |
| E030  | Skill import has empty name or source |
| E031  | Duplicate skill import within a module |
| E032  | Conflicting skill imports across modules (same name, different source) |
| E040  | Unknown agent reference `@name` (unless inline `@{...}`) |
| E041  | Non-literal agent configuration in `agent name(...)` |
| E050  | Invalid `case` pattern (not `_`, `error(_)`, `error(kind=\"...\")`, or `?`template``) |
| E051  | Unknown template placeholder name (`{name}` does not refer to any declared/builtin binding) |
| E052  | Malformed template placeholder (unescaped `{` or `}`) |
| E060  | Assignment to `it` |
| E070  | `constrain name(...):` where `name` is not bound before the statement |
| E080  | `return` used outside `def` |
| E081  | `break`/`continue` used outside a loop |
| E082  | `try:` without `except` or `finally` |
| E090  | Module import/export cannot be resolved (missing module or missing exported name) |

#### 15.2.3 Warning codes (non-blocking)

| Code  | Description |
| ----- | ----------- |
| W001  | Unknown skill import source format (host may still resolve it) |
| W010  | Agent references a skill that is not imported in the same module |
| W011  | Empty `skills=[]` on an agent declaration |
| W020  | Unknown agent configuration key (host-defined; portability risk) |
| W030  | Unused variable (best-effort) |
| W031  | Exported value never assigned (may fail at runtime) |

#### 15.2.4 Runtime errors vs validation errors

Some failures are inherently dynamic and occur during execution as **raised errors** of kind `thrown` (catchable by `try/except`) rather than as validation errors. Examples:
- calling a non-function value (`f(...)` when `f` is not a function)
- `if`/`while` condition that is not boolean
- iterating a non-list in `for`
- unresolved template placeholder when rendering a template literal
- arithmetic/comparison on unsupported types

#### 15.2.5 Diagnostic message shape (recommended)

Recommended format:

```
E004 line 12 col 18: unterminated template literal
  title = @writer `Draft the report.
                   ^
```

---

## 16. Grammar (Reference)

This grammar is intentionally approximate: VVM is designed to be simulated by an LLM, not to require a heavy external compiler.

Lexical notes:
- indentation uses Python-like `INDENT` / `DEDENT`
- comments start with `#` to end of line
- backtick templates support escapes
- runtimes should reject tabs for indentation (spaces only)

```ebnf
program        = stmt* ;

stmt           = comment
               | skill_import_stmt
               | module_import_stmt
               | export_stmt
               | agent_stmt
               | def_stmt
               | return_stmt
               | match_stmt
               | choose_stmt
               | constrain_stmt
               | with_input_stmt
               | if_stmt
               | while_stmt
               | for_stmt
               | try_stmt
               | raise_stmt
               | pass_stmt
               | break_stmt
               | continue_stmt
               | assign_stmt
               | expr_stmt ;

expr_stmt      = expr newline ;
comment        = "#" { not_nl } newline ;

agent_stmt     = "agent" ident "(" [kw_args] ")" newline ;

assign_stmt    = ident "=" expr newline ;

def_stmt       = "def" ident "(" [ident_list] ")" ":" newline INDENT stmt* DEDENT ;
return_stmt    = "return" [expr] newline ;

skill_import_stmt = "import" string "from" string newline ;
module_import_stmt= "from" string "import" import_name [ "as" ident ] newline ;
import_name    = ident | "@" ident ;
export_stmt    = "export" export_name newline ;
export_name    = ident | "@" ident ;

with_input_stmt= "with" "input" expr ":" newline INDENT stmt* DEDENT ;

match_stmt     = "match" expr ":" newline INDENT case_stmt+ DEDENT ;
case_stmt      = "case" pattern ":" newline INDENT stmt* DEDENT ;

choose_stmt    = "choose" expr "by" sem_pred_case "as" ident ":" newline INDENT option_stmt+ DEDENT ;
option_stmt    = "option" string ":" newline INDENT stmt* DEDENT ;

constrain_stmt = "constrain" ident "(" [kw_args] ")" ":" newline INDENT require_stmt+ DEDENT ;
require_stmt   = "require" sem_pred_case newline ;

if_stmt        = "if" expr ":" newline INDENT stmt* DEDENT [ "elif" expr ":" newline INDENT stmt* DEDENT ]* [ "else" ":" newline INDENT stmt* DEDENT ] ;
while_stmt     = "while" expr ":" newline INDENT stmt* DEDENT ;
for_stmt       = "for" ident "in" expr ":" newline INDENT stmt* DEDENT ;

	try_stmt       = "try" ":" newline INDENT stmt* DEDENT [except_block] [finally_block] ;
	except_block   = "except" "as" ident ":" newline INDENT stmt* DEDENT ;
	finally_block  = "finally" ":" newline INDENT stmt* DEDENT ;
raise_stmt     = "raise" [string] newline ;
pass_stmt      = "pass" newline ;
break_stmt     = "break" newline ;
continue_stmt  = "continue" newline ;

expr           = or_expr ;

or_expr        = and_expr ( "or" and_expr )* ;
and_expr       = not_expr ( "and" not_expr )* ;
not_expr       = [ "not" ] cmp_expr ;
cmp_expr       = add_expr ( cmp_op add_expr )* ;
cmp_op         = "==" | "!=" | "<" | "<=" | ">" | ">=" ;
add_expr       = primary ( ("+" | "-") primary )* ;

primary        = literal
               | ident
               | list
               | object
               | call
               | agent_call
               | sem_pred
               | "(" expr ")" ;

agent_call     = agent_ref template "(" [agent_args] ")" ;
agent_args     = kw_args | expr ["," kw_args] ;
agent_ref      = "@" ident [ ".with" "(" [kw_args] ")" ]
               | "@{" [kw_args] "}" ;

	sem_pred       = "?" template [ "(" expr ")" ] ;

call           = ident "(" [call_args] ")" ;
call_args      = kw_args | expr ("," expr)* ["," kw_args] ;
kw_args        = kw_arg ("," kw_arg)* [","] ;
kw_arg         = ident "=" expr ;

pattern        = "_" | error_pat | sem_pred_case ;
error_pat      = "error" "(" ( "_" | "kind" "=" string ) ")" ;
sem_pred_case  = "?" template ;

template       = "`" { any_char_except_unescaped_backtick } "`" ;

	literal        = "()" | "true" | "false" | number | string ;
string         = quoted_string | triple_quoted_string ;
quoted_string  = /"([^"\\\\]|\\\\.)*"/ ;
triple_quoted_string = /\"\"\"(.|\\n)*?\"\"\"/ ;
expr_list      = expr ("," expr)* [","] ;
list           = "[" [expr_list] "]" ;
object         = "{" [kv_list] "}" ;
kv_list        = kv ("," kv)* [","] ;
kv             = (ident | string) ":" expr ;

ident_list     = ident ("," ident)* ;
ident          = /[a-zA-Z_][a-zA-Z0-9_]*/ ;
number         = /[0-9]+(\\.[0-9]+)?/ ;
newline        = "\\n" ;
not_nl         = ? any char except newline ? ;
```

---

## 17. Examples (Informative)

These examples are complete VVM programs you can paste into a runtime.

### 17.1 Minimal “hello”

```vvm
agent greeter(model="haiku", prompt="Be concise.")

msg = @greeter `Say hello.`(())
export msg
```

### 17.2 Skills + permissions (least privilege)

```vvm
import "web-search" from "github:example/skills"

agent researcher(
  model="sonnet",
  prompt="Research thoroughly and cite sources.",
  skills=["web-search"],
  permissions=perm(
    read=[],
    write=[],
    execute=[],
    bash="deny",
    network="allow",
  ),
)

topic = "AI safety"
research = @researcher `Find 5-8 high-quality sources on {topic}.`(topic)
export research
```

### 17.3 Retry + error-value recovery

```vvm
agent api(model="sonnet")
agent backup(model="sonnet", prompt="Use an offline fallback approach.")

req = pack(endpoint="https://example.com", query="status")
resp = @api `Call the API and return JSON.`(req, retry=2, timeout="30s")

match resp:
  case error(kind="timeout"):
    resp = @backup `Provide best-effort cached status.`(req)
  case error(_):
    resp = @backup `Provide best-effort fallback status.`(req)
  case _:
    pass

export resp
```

### 17.4 Constrain + refine (expressible with loops)

```vvm
agent writer(model="opus")
agent critic(model="sonnet")

seed = @writer `Draft a short report with citations.`(())

def done(draft, i):
  with input draft:
    return ?`citations >= 3 and no hallucinations`

def step(draft, i):
  critique = @critic `Critique and suggest fixes.`(draft)
  return @writer `Revise using critique.`([draft, critique])

draft = refine(seed, 3, done, step)

constrain draft():
  require ?`citations >= 3`
  require ?`no hallucinations`

export draft
```

### 17.5 Module imports + exports

`lib/research.vvm`:

```vvm
export deep_research

agent researcher(model="sonnet")

def deep_research(topic):
  return @researcher `Research {topic}.`(topic)
```

`main.vvm`:

```vvm
from "./lib/research.vvm" import deep_research

topic = "quantum computing"
out = deep_research(topic)
export out
```
