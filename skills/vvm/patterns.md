---
role: best-practices
summary: |
  Design patterns for writing robust, efficient, and maintainable VVM programs.
see-also:
  - antipatterns.md: Anti-patterns to avoid
  - spec.md: Language specification
  - vvm.md: Execution semantics
---

# VVM Design Patterns

This document describes proven patterns for writing effective VVM programs.

---

## Structural Patterns

### Agent Specialization

**Problem:** A single agent trying to do too many different tasks produces inconsistent results.

**Solution:** Define focused agents with specific expertise.

```vvm
# Bad: One agent does everything
agent do_everything(model="opus", prompt="You do everything")

# Good: Specialized agents
agent researcher(model="sonnet", prompt="Research expert. Cite sources.")
agent writer(model="opus", prompt="Technical writer. Clear and concise.")
agent reviewer(model="sonnet", prompt="Code reviewer. Find bugs and issues.")
```

**Benefits:**
- Better prompt engineering per task
- Easier to tune model selection
- Clearer cost attribution

---

### Pipeline Composition

**Problem:** Complex workflows become hard to follow and maintain.

**Solution:** Chain transformations in clear stages.

```vvm
agent collector(model="sonnet")
agent analyzer(model="sonnet")
agent synthesizer(model="opus")

# Clear pipeline stages
raw_data = @collector `Gather data on {topic}.`(topic)
analysis = @analyzer `Analyze the data.`(raw_data)
report = @synthesizer `Synthesize into executive summary.`(analysis)

export report
```

**Benefits:**
- Each stage has clear input/output
- Easy to debug intermediate results
- Stages can be tested independently

---

### Parallel Independent Work

**Problem:** Independent tasks run sequentially, wasting time.

**Solution:** Use `pmap` for parallel execution.

```vvm
agent researcher(model="sonnet")

topics = ["AI safety", "quantum computing", "climate tech"]

# Sequential (slow)
# for topic in topics:
#   result = @researcher `Research {topic}.`(topic)

# Parallel (fast)
def research_topic(topic):
  return @researcher `Research {topic}.`(topic)

results = pmap(topics, research_topic)
```

**When to use:**
- Tasks are independent (no shared state)
- Order doesn't matter
- Side effects are safe to interleave

---

### Fan-Out Fan-In

**Problem:** Need multiple perspectives on the same input, then combine them.

**Solution:** Parallel analysis with aggregation.

```vvm
agent analyst(model="sonnet")
agent synthesizer(model="opus")

# Define perspectives as data
perspectives = [
  {view: "technical", focus: "architecture and performance"},
  {view: "business", focus: "market impact and ROI"}
]

# Fan out: parallel analysis from different perspectives
def analyze_perspective(p):
  return @analyst `Analyze from a {p.view} perspective, focusing on {p.focus}.`(research)

analyses = pmap(perspectives, analyze_perspective)

# Fan in: combine results
report = @synthesizer `Combine these analyses into a unified report.`(analyses)
```

---

### Reusable Functions

**Problem:** Same workflow pattern repeated in multiple places.

**Solution:** Extract to a function.

```vvm
agent researcher(model="sonnet")
agent writer(model="opus")

def research_and_write(topic):
  """Research a topic and produce a report."""
  research = @researcher `Find key information on {topic}.`(topic)
  return @writer `Write a clear summary.`(research)

# Reuse across the program
ai_report = research_and_write("AI trends")
quantum_report = research_and_write("quantum computing")
```

---

## Cost/Performance Patterns

### Model Tiering

**Problem:** Using expensive models for simple tasks wastes budget.

**Solution:** Match model capability to task complexity.

```vvm
# Tier 1: Simple tasks (haiku)
agent formatter(model="haiku", prompt="Format text clearly")
agent validator(model="haiku", prompt="Check for errors")

# Tier 2: Standard tasks (sonnet)
agent researcher(model="sonnet", prompt="Research thoroughly")
agent analyzer(model="sonnet", prompt="Analyze data")

# Tier 3: Complex tasks (opus)
agent architect(model="opus", prompt="Design complex systems")
agent synthesizer(model="opus", prompt="Synthesize multiple sources")
```

**Guidelines:**
- haiku: Formatting, validation, simple extraction
- sonnet: Research, analysis, standard generation
- opus: Complex reasoning, synthesis, creative work

---

### Early Termination

**Problem:** Loops continue even when work is complete.

**Solution:** Check completion conditions and exit early.

```vvm
agent improver(model="sonnet")

def is_done(draft, iteration):
  return ?`production ready with no issues`(draft)

def improve(draft, iteration):
  return @improver `Find and fix the most important issue.`(draft)

# Stops as soon as is_done returns true
final = refine(initial_draft, max=10, done=is_done, step=improve)
```

---

### Context Minimization

**Problem:** Passing entire context bloats prompts and costs.

**Solution:** Pass only what's needed.

```vvm
agent summarizer(model="haiku")
agent analyzer(model="sonnet")

# Bad: Pass everything
# analysis = @analyzer `Analyze.`(huge_document)

# Good: Summarize first, then analyze summary
summary = @summarizer `Extract key points only.`(huge_document)
analysis = @analyzer `Analyze these key points.`(summary)
```

**Techniques:**
- Summarize before passing
- Extract relevant sections
- Use `pack()` to select specific fields

---

## Reliability Patterns

### Graceful Degradation

**Problem:** Single failure breaks entire workflow.

**Solution:** Match on errors and provide fallbacks.

```vvm
agent primary(model="sonnet")
agent backup(model="haiku")

result = @primary `Process request.`(request, timeout="30s")

match result:
  case error(kind="timeout"):
    result = @backup `Quick fallback.`(request)
  case error(kind="rejected"):
    result = { status: "unavailable", reason: "service rejected" }
  case error(_):
    result = @backup `Best effort.`(request)
  case _:
    pass  # Success, keep result

export result
```

---

### Retry with Backoff

**Problem:** Transient failures cause unnecessary failures.

**Solution:** Use retry with exponential backoff.

```vvm
agent api_caller(model="sonnet")

# Retry up to 3 times with exponential backoff
result = @api_caller `Call external API.`(
  request,
  retry=3,
  backoff="exponential",
  timeout="30s"
)

# Still handle final failure
match result:
  case error(_):
    result = cached_fallback(request)
  case _:
    pass
```

---

### Constraint Validation

**Problem:** Output quality varies unpredictably.

**Solution:** Use `constrain` blocks to enforce requirements.

```vvm
agent writer(model="opus")

draft = @writer `Write technical documentation.`(spec)

constrain draft(attempts=3):
  require ?`includes code examples`
  require ?`covers all API endpoints`
  require ?`no placeholder text like TODO or TBD`

match draft:
  case error(kind="constraint_violation"):
    # Handle failed constraints
    draft = @writer `Fix these issues: {draft.error.data.violations}`(draft)
  case _:
    pass
```

---

### Defensive Validation

**Problem:** Bad input causes cryptic failures deep in workflow.

**Solution:** Validate inputs early.

```vvm
agent validator(model="haiku")
agent processor(model="sonnet")

def process_safely(input):
  # Validate first
  if not ?`valid JSON with required fields`(input):
    raise "Invalid input format"

  if not ?`contains necessary data`(input):
    raise "Missing required data"

  # Now process with confidence
  return @processor `Process validated input.`(input)
```

---

## Composition Patterns

### Conditional Branching

**Problem:** Different inputs need different processing paths.

**Solution:** Use `choose` for semantic branching.

```vvm
agent quick_handler(model="haiku")
agent complex_handler(model="opus")

choose request by ?`complexity level` as complexity:
  option "simple":
    result = @quick_handler `Handle quickly.`(request)
  option "complex":
    result = @complex_handler `Handle thoroughly.`(request)

export result
```

---

### Iterative Refinement

**Problem:** First attempt rarely produces best result.

**Solution:** Use `refine` for iterative improvement.

```vvm
agent writer(model="opus")
agent critic(model="sonnet")

initial = @writer `Draft a report on {topic}.`(topic)

def is_done(draft, i):
  return ?`ready for publication`(draft) or i >= 5

def improve(draft, i):
  critique = @critic `Find issues.`(draft)
  return @writer `Address these issues.`([draft, critique])

final = refine(initial, max=10, done=is_done, step=improve)
```

---

### Module Organization

**Problem:** Large programs become unwieldy.

**Solution:** Split into focused modules.

```vvm
# lib/agents.vvm
agent researcher(model="sonnet", prompt="Research expert")
agent writer(model="opus", prompt="Technical writer")
export @researcher
export @writer

# lib/workflows.vvm
from "./agents.vvm" import @researcher
from "./agents.vvm" import @writer

def research_and_report(topic):
  research = @researcher `Research {topic}.`(topic)
  return @writer `Write report.`(research)

export research_and_report

# main.vvm
from "./lib/workflows.vvm" import research_and_report

report = research_and_report("AI safety")
export report
```

---

## Summary

| Pattern | When to Use |
|---------|-------------|
| Agent Specialization | Multiple distinct task types |
| Pipeline Composition | Multi-stage transformations |
| Parallel Independent Work | Independent tasks, `pmap` |
| Fan-Out Fan-In | Multiple perspectives + aggregation |
| Reusable Functions | Repeated workflow patterns |
| Model Tiering | Optimizing cost/capability |
| Early Termination | Avoiding unnecessary work |
| Context Minimization | Large inputs |
| Graceful Degradation | Handling failures |
| Retry with Backoff | Transient failures |
| Constraint Validation | Quality enforcement |
| Defensive Validation | Input checking |
| Conditional Branching | Different processing paths |
| Iterative Refinement | Quality improvement |
| Module Organization | Large programs |
