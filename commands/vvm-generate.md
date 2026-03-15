---
description: Generate VVM programs from natural language descriptions
argument-hint: <description of what you want to build>
---

# VVM Generate

Generate well-structured VVM programs from natural language descriptions. This command helps users transition from natural language prompting to VVM's structured agent orchestration, including modern VVM features (parallel blocks, artifact-backed state modes, registry imports, and callable module contracts).

## Phases

### Phase 1: Understand Intent

Read the user's natural language description and infer:
- The core goal (what should the program accomplish?)
- Input requirements (what data does it need?)
- Output expectations (what should it produce?)
- Quality requirements (any constraints or standards?)

**Do not ask clarifying questions.** Make reasonable assumptions based on the description and generate the program immediately.

### Phase 2: Analyze Requirements

Map the user's intent to VVM constructs:

| User Intent | VVM Construct |
|-------------|---------------|
| "Call an AI to do X" | `@worker \`prompt\`(request)` |
| "Check if X is true" | `?\`condition\`(value)` |
| "Route based on content type" | `match value: case ?\`pattern\`:` |
| "AI picks best approach" | `choose value by ?\`criterion\` as choice:` |
| "If X then Y else Z" | `if`/`elif`/`else` |
| "Repeat until done" | `while` with bounds or `refine()` |
| "Process each item" | `for item in items:` |
| "Process items in parallel" | `pmap(items, function)` |
| "Run different tasks concurrently" | `parallel(...) as results:` with named branches |
| "Race multiple strategies" | `parallel(join="first", on_fail="continue")` |
| "Need N-of-M consensus" | `parallel(join="any", count=N, on_fail="continue")` |
| "Set context for operations" | `with input value:` |
| "Handle failures gracefully" | `match` on `error(_)` |
| "Guaranteed cleanup" | `try`/`except`/`finally` |
| "Create agent variants" | `.with()` or inline `@{...}` |
| "Reuse logic" | `def function(params):` |
| "Use external tools" | `import` + `skills=` + `permissions=` |
| "Reusable workflow API" | `input ...` + `export ...` + callable module import (`* as`) |
| "Use shared remote workflow" | `from "@handle/slug" import ...` or `from "https://..." import ...` |
| "Transform a list" | `map(items, fn)` |
| "Filter a list" | `filter(items, predicate)` |
| "Aggregate results" | `reduce(items, fn, init=value)` |
| "Combine multiple values" | `pack(a, b, c)` |
| "Iteratively improve" | `refine(seed, max=N, done=check, step=improve)` |
| "Enforce quality standards" | `constrain value(): require ?\`criterion\`` |
| "Large outputs or long workflows" | Keep agent boundaries ref-friendly (portable across `--state=` backends) |

### Phase 3: Design Architecture

1. **Identify agent roles** — Each agent should have focused expertise
2. **Choose model tiers** — Match model to task complexity:
   - `haiku`: Simple formatting, validation, extraction, classification
   - `sonnet`: Research, analysis, standard generation (default)
   - `opus`: Complex reasoning, synthesis, critical decisions
3. **Decide program shape** — Script-style run vs callable module contract (`input` + `export`)
4. **Plan data flow** — How does data move between stages? Keep it structured/ref-friendly
5. **Identify parallelism** — Use `pmap` for homogeneous list work; use `parallel()` for heterogeneous branches/races/voting
6. **Plan state mode portability** — Author code that works in in-context and artifact-backed modes
7. **Plan error handling** — What can fail? Add `retry=`, match on `error()`, and fallbacks
8. **Add quality and observability hooks** — Use `constrain`/`require`; include outputs useful for run inspection

### Phase 4: Generate Code

**Apply these patterns** (from `skills/vvm/patterns.md`):
- Agent Specialization: Each agent has one clear purpose
- Pipeline Composition: Clear I/O at each stage
- Model Tiering: Right model for task complexity
- State Mode Selection: Keep workflows portable across `in-context|filesystem|sqlite|postgres`
- Parallel Block Patterns: `parallel()` for heterogeneous concurrent work, races, and N-of-M voting
- Explicit Data Flow: Don't over-rely on implicit `it`
- Graceful Degradation: Handle failures with fallbacks
- Bounded Iteration: Always set max limits on loops
- Contract-Safe Composition: Use explicit `input`/`export` surfaces and guard optional outputs when needed

**Avoid these anti-patterns** (from `skills/vvm/antipatterns.md`):
- God Agent: One agent doing everything (split into specialists)
- Context Explosion: Passing all data everywhere (pass only what's needed)
- Unbounded Loops: No max iterations (always add bounds)
- Model Inflation: Using opus for simple tasks (tier appropriately)
- Silent Failures: Not handling errors (match on `error(_)`)
- Large artifact workflows in in-context mode when scale/inspection matters
- Blind remote imports without trust/inspect/cache policy
- Assuming module output keys always exist across evolving contracts

**Code structure:**
```vvm
# 1. Skill imports (if external tools needed)
import "skill-name" from "source"

# 2. Module imports (optional local/registry/URL workflows)
from "./lib/workflow.vvm" import * as workflow

# 3. Inputs (for reusable/callable workflows)
input request: "What this workflow needs"

# 4. Agent definitions (specialized, model-tiered)
agent worker(model="tier", prompt="Focused expertise.")

# 5. Helper functions (for reusable patterns)
def helper(params):
  return result

# 6. Optional heterogeneous parallel work
parallel(join="all", on_fail="continue") as branches:
  a = @worker `Task A.`(request)
  b = @worker `Task B.`(request)

# 7. Main workflow logic
result = @worker `task`(request)

# 8. Quality constraints (if needed)
constrain result():
  require ?`quality criterion`

# 9. Exports (workflow contract surface)
export result
```

### Phase 5: Output

Output ONLY the VVM program code. No explanations, no design decisions, no markdown formatting, no code fences. Just the raw VVM program text that can be directly saved to a `.vvm` file.

## Output Format

Output the VVM program directly with no surrounding text or formatting. The response should start with the first line of VVM code (typically a comment or import) and end with the last line (typically an export).

## Files to Read

- `skills/vvm/spec.md` — Language specification and grammar
- `skills/vvm/patterns.md` — Design patterns to follow
- `skills/vvm/antipatterns.md` — Patterns to avoid
- `commands/vvm-run.md` — State modes, registry/offline options
- `commands/vvm-run-inspect.md` — Inspect UX for filesystem/sqlite/postgres runs
- `commands/vvm-registry-inspect.md` — Contract inspection for remote modules
- `examples/` — Reference examples for similar patterns (especially 33, 34, 38, 39)

## Example

**User:** `/vvm-generate Create a program that reviews pull requests for security issues`

**Response:**

# PR Security Review Pipeline

agent diff_analyzer(model="sonnet", prompt="Code change analyst. Understand what changed and why.")
agent security_reviewer(model="opus", prompt="Security expert. Find vulnerabilities, injection risks, auth issues.")
agent report_writer(model="sonnet", prompt="Technical writer. Create clear, actionable reports.")

analysis = @diff_analyzer `Analyze these code changes: {}`(pr_diff)

security_findings = @security_reviewer `Review for security vulnerabilities.`(analysis)

match security_findings:
  case error(_):
    security_findings = "Security review unavailable. Manual review recommended."

report = @report_writer `Create a security review report with findings and recommendations.`(
  pack(analysis, security_findings)
)

constrain report(attempts=2):
  require ?`has specific recommendations`
  require ?`mentions severity levels`

export report
