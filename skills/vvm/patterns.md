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

## Parallel Block Patterns

These patterns use `parallel()` blocks for heterogeneous concurrent work—different tasks running simultaneously, not the same function on different inputs.

### Heterogeneous Parallel Work

**Problem:** Different independent tasks need to run concurrently.

**Solution:** Use `parallel()` blocks for heterogeneous concurrent work.

```vvm
agent researcher(model="sonnet")
agent analyst(model="sonnet")
agent reviewer(model="sonnet")
agent synthesizer(model="opus")

parallel() as results:
  papers = @researcher `Find relevant papers.`(topic)
  market = @analyst `Analyze market trends.`(topic)
  risks = @reviewer `Identify potential risks.`(topic)

# All three run concurrently; results contains all values
report = @synthesizer `Combine findings.`(results)
```

**When to use:**
- Tasks are independent but different (not homogeneous like pmap)
- You need all results before proceeding
- Tasks don't share memory state

---

### Racing Approaches

**Problem:** Multiple ways to solve a problem; you want the fastest answer.

**Solution:** Use `join="first"` to race approaches.

```vvm
agent heuristic(model="haiku")
agent solver(model="sonnet")
agent lateral(model="sonnet")

parallel(join="first", on_fail="continue") as race:
  quick = @heuristic `Fast heuristic solution.`(problem)
  thorough = @solver `Exhaustive search.`(problem)
  creative = @lateral `Unconventional approach.`(problem)

# race._winner tells you which approach won
solution = race[race._winner]
```

**When to use:**
- Multiple valid approaches with different speed/quality trade-offs
- Any correct answer is acceptable
- You want minimum latency

---

### Ensemble Voting (N-of-M)

**Problem:** Need consensus from multiple independent evaluators.

**Solution:** Use `join="any"` with count for N-of-M patterns.

```vvm
agent evaluator(model="sonnet")
agent synthesizer(model="opus")

parallel(join="any", count=3, on_fail="continue") as votes:
  v1 = @evaluator `Judge proposal.`(proposal, memory_mode="fresh")
  v2 = @evaluator `Judge proposal.`(proposal, memory_mode="fresh")
  v3 = @evaluator `Judge proposal.`(proposal, memory_mode="fresh")
  v4 = @evaluator `Judge proposal.`(proposal, memory_mode="fresh")
  v5 = @evaluator `Judge proposal.`(proposal, memory_mode="fresh")

# Proceeds when 3 votes are in; votes._completed lists which 3
decision = @synthesizer `Aggregate votes.`(votes)
```

**When to use:**
- Need redundancy or consensus
- Individual evaluators may fail or timeout
- Want to proceed as soon as threshold is met

---

### Parallel with Fresh Memory

**Problem:** Parallel branches using memory-enabled agents cause lock contention.

**Solution:** Use `memory_mode="fresh"` for parallel workers.

```vvm
agent helper(model="sonnet", memory={ scope: "project", key: "team" })

parallel() as results:
  a = @helper `Process item A.`(itemA, memory_mode="fresh")
  b = @helper `Process item B.`(itemB, memory_mode="fresh")
  c = @helper `Process item C.`(itemC, memory_mode="fresh")

# Each branch runs stateless; no lock contention
```

**When to use:**
- Agent has memory configured
- Branches don't need to write to memory
- You'll merge/update memory in a sequential step

---

### Parallel Merge (Fresh Work + Sequential Update)

**Problem:** Parallel work needs to eventually update shared memory.

**Solution:** Parallel workers run fresh; single sequential step merges and updates memory.

```vvm
agent worker(model="sonnet", memory={ scope: "project", key: "research" })

# Phase 1: Parallel work (fresh memory)
parallel() as analyses:
  tech = @worker `Analyze technical aspects.`(topic, memory_mode="fresh")
  market = @worker `Analyze market aspects.`(topic, memory_mode="fresh")
  legal = @worker `Analyze legal aspects.`(topic, memory_mode="fresh")

# Phase 2: Sequential merge (uses memory)
synthesis = @worker `Synthesize all analyses and update research memory.`(analyses)
# This single call can safely read and write memory
```

**Why this works:**
- Parallel phase: No lock contention (all branches fresh)
- Sequential phase: Single writer updates memory
- Memory ledger shows clean single update, not interleaved writes

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

### State Mode Selection by Workload

**Problem:** Programs are authored without considering runtime state mode, causing token blowups or weak observability in production.

**Solution:** Design programs to be state-mode portable, then choose backend at run-time based on workload.

```vvm
# Keep agent boundaries ref-friendly so this program works in all state modes.
agent researcher(model="sonnet")
agent writer(model="sonnet")

research = @researcher `Research {topic} with sources.`(topic)
report = @writer `Write report from this research.`(research)

export report
```

**Backend guidance:**
- `in-context`: quick iteration, small workflows
- `filesystem`: large outputs and artifact inspection
- `sqlite`: local SQL-debuggable run state
- `postgres`: team observability and high-concurrency workflows

**Key idea:** Keep data flow structured and artifact-friendly so switching `--state=` does not require code changes.

---

## Reliability Patterns

### Persistent Agent Memory (Digest + Ledger)

**Problem:** You want continuity across runs, but you don’t want to re-pass huge context or accidentally persist sensitive data.

**Solution:** Bind `memory` to the agent. When memory is enabled, the runtime injects memory context and a short reminder of the `vvm-memory` patch channel, so you usually don’t need to restate the protocol in every agent prompt.

```vvm
agent coach(
  model="sonnet",
  prompt="""
You are a coaching assistant.

Hard rules:
- Never store secrets, tokens, credentials, or private keys.
 - Keep advice concise and actionable.
""",
  memory={ scope: "project", key: "user:alice" },
)

reply = @coach `Help me plan my week.`(request)
audit = @coach `Answer, but don't update memory.`(request, memory_mode="dry_run")
```

**Benefits:**
- Continuity without passing full history
- Inspectable, editable memory on disk
- Bounded growth (digest stays small; ledger is append-only)

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

### Inspect-Driven Recovery

**Problem:** Long workflows fail but teams lack a consistent recovery loop, so they rerun blindly.

**Solution:** Treat run inspection as a first-class phase in reliability workflows.

```vvm
agent inspector(
  model="haiku",
  permissions=perm(read=[".vvm/runs/**"], write=[], bash="deny", network="deny"),
  prompt="Summarize run failures with statement-level evidence."
)

run_id = "20260315-102055-a1b2c3"
summary = @inspector `Inspect run artifacts for failures and likely root causes.`(".vvm/runs/" + run_id)

export summary
```

**Operational guidance:**
- Use `/vvm-run-inspect <run-id>` during incident response.
- In sqlite/postgres modes, query run/execution/bindings tables for precise failure localization.
- Feed inspection output back into targeted repair steps instead of full blind reruns.

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

**Solution:** Split into focused modules. Agents are local to each module; export functions and values.

```vvm
# lib/research.vvm
input topic: "The topic to research"

agent researcher(model="sonnet", prompt="Research expert")
agent writer(model="opus", prompt="Technical writer")

research = @researcher `Research {topic}.`(topic)
report = @writer `Write report.`(research)

export research
export report

# main.vvm
from "./lib/research.vvm" import * as research_module

result = research_module(topic="AI safety")
final_report = result.report

export final_report
```

**Key insight:** Agents are implementation details. Modules export their computed values, not their agent definitions.

---

### Parameterized Module

**Problem:** You have a workflow that needs to run multiple times with different inputs.

**Solution:** Extract to a module with input declarations, import and call it.

```vvm
# lib/analyze.vvm
input data: "The data to analyze"
input focus: "Analysis focus area" = "general"

agent analyst(model="sonnet", prompt="Expert data analyst.")

analysis = @analyst `Analyze {data} with focus on {focus}.`(pack(data, focus))

export analysis

# main.vvm
from "./lib/analyze.vvm" import * as analyze

tech = analyze(data=report, focus="technical")
business = analyze(data=report, focus="business")
```

**Benefits:**
- Reuse without code duplication
- Clear parameterization via inputs
- Testable in isolation

---

### Contract-Safe Output Access

**Problem:** Callers assume output keys exist and crash when module contracts evolve.

**Solution:** Treat module outputs as explicit contracts and guard optional keys.

```vvm
from "./lib/analyze.vvm" import * as analyze

result = analyze(data=report, focus="security")
primary = result.analysis

# Guard optional/unstable keys
maybe_extra = result["extra_notes"]
match maybe_extra:
  case error(kind="unknown_output"):
    maybe_extra = ()
  case _:
    pass

export primary
export maybe_extra
```

**When to use:**
- shared libraries with evolving contracts
- remote/registry modules where producer and consumer evolve independently

---

### Contract-First Remote Workflow Reuse

**Problem:** Teams import remote workflows directly in production without validating trust, cache, or contracts.

**Solution:** Use registry/URL modules with explicit contract-first onboarding.

```vvm
from "@team/pr/review" import * as review_workflow

result = review_workflow(pr_url=pr_url, strict=true)
report = result.report

export report
```

**Operational guidance:**
- Inspect remote contracts before rollout with `/vvm-registry-inspect`.
- Enforce allowlist/denylist and HTTPS policy.
- Use offline/cache-only mode in CI for reproducible builds.

---

### Module Pipeline

**Problem:** Multi-stage workflow where each stage is distinct and reusable.

**Solution:** Each stage is a module; main orchestrates the flow.

```vvm
# lib/gather.vvm
input topic: "Topic to research"
agent researcher(model="sonnet", prompt="Research expert.")
data = @researcher `Gather data on {topic}.`(topic)
export data

# lib/analyze.vvm
input data: "Data to analyze"
agent analyst(model="sonnet", prompt="Data analyst.")
analysis = @analyst `Analyze this data.`(data)
export analysis

# lib/report.vvm
input analysis: "Analysis to report on"
agent writer(model="opus", prompt="Report writer.")
report = @writer `Write executive summary.`(analysis)
export report

# main.vvm
from "./lib/gather.vvm" import * as gather
from "./lib/analyze.vvm" import * as analyze
from "./lib/report.vvm" import * as report

raw = gather(topic="AI safety")
insights = analyze(data=raw.data)
final = report(analysis=insights.analysis)

export final
```

**Benefits:**
- Each stage testable independently
- Clear data flow
- Easy to modify individual stages

---

### Parallel Module Calls

**Problem:** Independent module invocations that could run concurrently.

**Solution:** Use `pmap` with module calls.

```vvm
from "./lib/research.vvm" import * as research

topics = ["AI safety", "quantum computing", "climate tech"]

def research_topic(topic):
  return research(topic=topic)

# Run all three in parallel
results = pmap(topics, research_topic)

# Access individual results
ai_report = results[0].report
quantum_report = results[1].report
climate_report = results[2].report
```

**When to use:**
- Multiple independent module calls
- Same module, different inputs
- Order doesn't matter

---

## Summary

| Pattern | When to Use |
|---------|-------------|
| Agent Specialization | Multiple distinct task types |
| Pipeline Composition | Multi-stage transformations |
| Parallel Independent Work | Independent tasks, `pmap` |
| Fan-Out Fan-In | Multiple perspectives + aggregation |
| Heterogeneous Parallel Work | Different independent tasks, `parallel()` |
| Racing Approaches | Multiple solutions, want fastest |
| Ensemble Voting | Consensus/redundancy needed |
| Parallel with Fresh Memory | Memory agent in parallel branches |
| Parallel Merge | Parallel work + sequential memory update |
| Reusable Functions | Repeated workflow patterns |
| Model Tiering | Optimizing cost/capability |
| Early Termination | Avoiding unnecessary work |
| Context Minimization | Large inputs |
| State Mode Selection | Matching backend to workload and observability needs |
| Persistent Agent Memory | Cross-run continuity |
| Graceful Degradation | Handling failures |
| Retry with Backoff | Transient failures |
| Constraint Validation | Quality enforcement |
| Defensive Validation | Input checking |
| Inspect-Driven Recovery | Failure triage from run artifacts/backends |
| Conditional Branching | Different processing paths |
| Iterative Refinement | Quality improvement |
| Module Organization | Large programs |
| Parameterized Module | Reusable workflows with inputs |
| Contract-Safe Output Access | Handling evolving module output contracts |
| Contract-First Remote Workflow Reuse | Safe registry/URL-based module composition |
| Module Pipeline | Multi-stage workflows |
| Parallel Module Calls | Concurrent module invocations |
