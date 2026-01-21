---
description: Generate VVM programs from natural language descriptions
argument-hint: <description of what you want to build>
---

# VVM Generate

Generate well-structured VVM programs from natural language descriptions. This command helps users transition from natural language prompting to VVM's structured agent orchestration.

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
| "Call an AI to do X" | `@agent \`prompt\`(input)` |
| "Check if X is true" | `?\`condition\`(value)` |
| "Route based on content type" | `match value: case ?\`pattern\`:` |
| "AI picks best approach" | `choose value by ?\`criterion\` as choice:` |
| "If X then Y else Z" | `if`/`elif`/`else` |
| "Repeat until done" | `while` with bounds or `refine()` |
| "Process each item" | `for item in items:` |
| "Process items in parallel" | `pmap(items, function)` |
| "Set context for operations" | `with input value:` |
| "Handle failures gracefully" | `match` on `error(_)` |
| "Guaranteed cleanup" | `try`/`except`/`finally` |
| "Create agent variants" | `.with()` or inline `@{...}` |
| "Reuse logic" | `def function(params):` |
| "Use external tools" | `import` + `skills=` + `permissions=` |
| "Transform a list" | `map(items, fn)` |
| "Filter a list" | `filter(items, predicate)` |
| "Aggregate results" | `reduce(items, fn, init=value)` |
| "Combine multiple values" | `pack(a, b, c)` |
| "Iteratively improve" | `refine(seed, max=N, done=check, step=improve)` |
| "Enforce quality standards" | `constrain value(): require ?\`criterion\`` |

### Phase 3: Design Architecture

1. **Identify agent roles** — Each agent should have focused expertise
2. **Choose model tiers** — Match model to task complexity:
   - `haiku`: Simple formatting, validation, extraction, classification
   - `sonnet`: Research, analysis, standard generation (default)
   - `opus`: Complex reasoning, synthesis, critical decisions
3. **Plan data flow** — How does data move between stages?
4. **Identify parallelism** — Which tasks are independent? Use `pmap()`
5. **Plan error handling** — What can fail? Add `retry=`, match on `error()`
6. **Add quality gates** — Use `constrain`/`require` for critical outputs

### Phase 4: Generate Code

**Apply these patterns** (from `skills/vvm/patterns.md`):
- Agent Specialization: Each agent has one clear purpose
- Pipeline Composition: Clear I/O at each stage
- Model Tiering: Right model for task complexity
- Explicit Data Flow: Don't over-rely on implicit `it`
- Graceful Degradation: Handle failures with fallbacks
- Bounded Iteration: Always set max limits on loops

**Avoid these anti-patterns** (from `skills/vvm/antipatterns.md`):
- God Agent: One agent doing everything (split into specialists)
- Context Explosion: Passing all data everywhere (pass only what's needed)
- Unbounded Loops: No max iterations (always add bounds)
- Model Inflation: Using opus for simple tasks (tier appropriately)
- Silent Failures: Not handling errors (match on `error(_)`)

**Code structure:**
```vvm
# 1. Skill imports (if external tools needed)
import "skill-name" from "source"

# 2. Agent definitions (specialized, model-tiered)
agent name(model="tier", prompt="Focused expertise.")

# 3. Helper functions (for reusable patterns)
def helper(params):
  return result

# 4. Main workflow logic
result = @agent `task`(input)

# 5. Quality constraints (if needed)
constrain result():
  require ?`quality criterion`

# 6. Exports
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
- `examples/` — Reference examples for similar patterns

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
