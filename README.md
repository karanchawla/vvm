# VVM

**Vibe Virtual Machine** — A language for agentic programs where the LLM is the runtime.

```vvm
# A code review bot that iteratively improves until approved
agent coder(model="sonnet", prompt="Write clean, well-tested code.")
agent reviewer(model="opus", prompt="Review code critically. Find bugs and issues.")

def is_approved(code, i):
  review = @reviewer `Review this code. Say APPROVED if production-ready.`(code)
  return ?`contains APPROVED`(review)

def improve(code, i):
  feedback = @reviewer `List specific issues with this code.`(code)
  return @coder `Fix these issues: {feedback}`(pack(code, feedback))

final_code = refine(initial_code, max=5, done=is_approved, step=improve)

constrain final_code():
  require ?`has error handling`
  require ?`includes unit tests`

export final_code
```

---

## The Insight

A language model with tool access is a general-purpose computer. Not metaphorically. Literally.

Every time you use Claude Code, Cursor, or Codex, you're instructing a machine that reads files, writes code, executes commands, and iterates on its outputs. We've been calling these "assistants" because we didn't have better words. But assistants don't spawn subprocesses or manage their own control flow.

**The problem with English.** Simple tasks work fine—"refactor this function" needs no specification. Complex tasks fall apart. You want three analyses to run in parallel, feed into a synthesis, retry on failure, and only proceed if the output meets a quality bar. You can say that in English. But which parts are instructions and which are suggestions? Which are hard constraints and which are preferences? English handles intent well. It can't handle structure.

**Inversion.** Most frameworks (LangChain, etc.) put orchestration in your code and treat the model as a function to call. VVM inverts this. You write a program, hand it to the model, and the model becomes the runtime. The intelligence doesn't just execute steps—it interprets the program, manages dependencies, decides how to proceed when things go wrong.

**Predicates that understand.** When orchestration lives in Python, conditions must be things Python can compute—proxy metrics like `if confidence_score > 0.8`. When orchestration lives in the model, conditions can be semantic. "Is this production ready?" isn't a threshold. It's a question the runtime answers by reading and judging. The program operates in meaning-space.

VVM is open source and runtime-agnostic. Today it runs on Claude Code. Codex, Amp, and OpenCode support is planned.

---

## Installation

VVM runs as a Claude Code plugin. To install:

```bash
# Add the plugin marketplace
claude plugin marketplace add https://github.com/karanchawla/vvm.git

# Install the plugin
claude plugin install vvm@vvm
```

After installation, ask Claude to help you get started:

> "Run my first VVM example and teach me how it works"

Claude will walk you through the language, run an example program, and explain the execution.

---

## The Language

### Agents

Named agents with models and system prompts:

```vvm
agent researcher(model="sonnet", prompt="Research expert. Always cite sources.")
agent writer(model="opus", prompt="Technical writer. Clear and concise.")

research = @researcher `Find papers on quantum error correction.`(())
report = @writer `Summarize the key findings.`(research)
```

### Semantic Predicates

Conditions evaluated by the runtime's judgment, not regex:

```vvm
if ?`contains sensitive information`(document):
  document = @redactor `Remove PII and confidential data.`(document)
```

### Pattern Matching

Route based on meaning:

```vvm
match ticket:
  case ?`billing or payment issue`:
    team = "billing"
  case ?`security concern`:
    team = "security"
  case _:
    team = "general"
```

### Constraints

Requirements with automatic retry on failure:

```vvm
constrain draft(attempts=3):
  require ?`cites at least 3 sources`
  require ?`no unsubstantiated claims`
  require ?`professional tone`
```

### Parallelism

Explicit, never implicit:

```vvm
def translate(text):
  return @translator `Translate to French.`(text)

translations = pmap(documents, translate)  # Runs in parallel
```

### Refinement Loops

Iterate until done:

```vvm
final = refine(
  seed=first_draft,
  max=5,
  done=is_publication_ready,
  step=incorporate_feedback
)
```

---

## Execution Model

1. **Parse** — Read `.vvm`, build AST
2. **Validate** — Check syntax, resolve references, verify constraints
3. **Execute** — Run statements top-to-bottom, eagerly
4. **Spawn** — Agent calls (`@agent`) spawn subagents via Task tool
5. **Evaluate** — Semantic predicates (`?`...``) judged by the runtime
6. **Export** — Return declared exports

```
┌─────────────────────────────────────────────────┐
│                   VVM Runtime                   │
│                  (Claude LLM)                   │
├─────────────────────────────────────────────────┤
│  .vvm Program                                   │
│  ├── agent definitions                          │
│  ├── function definitions                       │
│  └── top-level statements                       │
├─────────────────────────────────────────────────┤
│  Execution                                      │
│  ├── @agent calls → spawn subagent (Task tool) │
│  ├── ?`predicate` → local semantic judgment    │
│  └── control flow → sequential, explicit       │
└─────────────────────────────────────────────────┘
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/vvm-boot` | Initialize VVM, create first program |
| `/vvm-compile <file>` | Validate without running |
| `/vvm-run <file>` | Execute a program |

---

## Examples

The `examples/` directory has 23 programs, progressively introducing features:

- **01-08**: Basics (agents, predicates, control flow)
- **09-15**: Intermediate (parallelism, modules, error handling)
- **16-23**: Advanced (constraints, refinement loops, full pipelines)

---

## Caveats

**This is experimental.** The language spec will change. Breaking changes are likely. Pin versions if you care about stability.

**You own your agents.** VVM programs spawn AI agents that can read files, make network requests, and execute code. Review what you're running. Test in sandboxes first. The authors disclaim liability for agent behavior—this is on you.

---

## License

MIT
