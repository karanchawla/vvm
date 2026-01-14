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

## Philosophy

You've been programming a computer without realizing it.

Every time you use Claude Code, Cursor, or Codex, you're instructing a machine that can read files, write code, execute commands, and iterate on its own outputs. That's not an assistant. That's a general-purpose computer that understands meaning.

**When English breaks down.** Simple tasks are fine—"refactor this function" needs no specification. Complex tasks fall apart. You want three analyses to run in parallel, feed into a synthesis, retry on failure, and only proceed if the output meets a quality bar. You can say that in English. But which parts are instructions and which are suggestions? English handles intent. It can't handle structure.

**The model is the runtime.** VVM inverts the usual pattern. Frameworks like LangChain put orchestration in your code and treat the model as a function to call. VVM puts orchestration inside the model. You write a program, hand it to the model, and the model becomes the runtime. The intelligence doesn't just execute steps—it interprets the program, manages dependencies, and makes decisions about how to proceed.

**Predicates that understand.** When orchestration lives in Python, conditions must be things Python can compute—proxy metrics like `if confidence_score > 0.8`. When orchestration lives in the model, conditions can be semantic. "Is this production ready?" isn't a threshold. It's a question the runtime answers by reading and judging. The model operates in meaning-space. Now your programs can too.

VVM is open source and runtime-agnostic. Today it runs on Claude Code. Codex, Amp, and OpenCode are planned.

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

## Key Features

### Agents

Define agents with specific models and system prompts:

```vvm
agent researcher(model="sonnet", prompt="Research expert. Always cite sources.")
agent writer(model="opus", prompt="Technical writer. Clear and concise.")

research = @researcher `Find papers on quantum error correction.`(())
report = @writer `Summarize the key findings.`(research)
```

### Semantic Predicates

Make decisions based on meaning, not regex:

```vvm
if ?`contains sensitive information`(document):
  document = @redactor `Remove PII and confidential data.`(document)
```

### Pattern Matching

Route based on semantic understanding:

```vvm
match ticket:
  case ?`billing or payment issue`:
    team = "billing"
  case ?`security concern`:
    team = "security"
  case _:
    team = "general"
```

### Quality Constraints

Enforce requirements with automatic retry:

```vvm
constrain draft(attempts=3):
  require ?`cites at least 3 sources`
  require ?`no unsubstantiated claims`
  require ?`professional tone`
```

### Parallel Execution

Fan out work explicitly:

```vvm
def translate(text):
  return @translator `Translate to French.`(text)

translations = pmap(documents, translate)  # Runs in parallel
```

### Iterative Refinement

Loop until quality criteria are met:

```vvm
final = refine(
  seed=first_draft,
  max=5,
  done=is_publication_ready,
  step=incorporate_feedback
)
```

---

## How It Works

VVM execution follows a simple model:

1. **Parse** — Read the `.vvm` file and build an AST
2. **Validate** — Check syntax, resolve references, verify constraints
3. **Execute** — Run statements top-to-bottom, eagerly
4. **Spawn** — Agent calls (`@agent`) spawn subagents via the Task tool
5. **Evaluate** — Semantic predicates (`?`...``) are judged locally by the VM
6. **Export** — Return the declared exports

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

Parallelism is **never implicit**. Use `pmap()` when you want concurrent execution.

---

## Commands

| Command | Description |
|---------|-------------|
| `/vvm-boot` | Initialize VVM and create your first program |
| `/vvm-compile <file>` | Validate a program without running it |
| `/vvm-run <file>` | Execute a VVM program |

---

## Examples

The `examples/` directory contains 23 progressive examples covering all language features:

- **01-08**: Basics (agents, predicates, control flow)
- **09-15**: Intermediate (parallelism, modules, error handling)
- **16-23**: Advanced (constraints, refinement loops, full pipelines)

See `examples/README.md` for the complete list.

---

## Active Development

VVM is under active development. The language specification may change between versions, and **breaking changes are possible**.

We recommend pinning to a specific version for production use and testing thoroughly when upgrading.

---

## Responsibility

VVM programs spawn AI agents that can read files, make network requests, and execute code. **You are responsible for the actions of agents in your programs.**

Before running a VVM program:
- Review the agent definitions and their permissions
- Understand what tools and capabilities agents will have access to
- Test in a safe environment first

The VVM authors are not liable for any damages caused by agents spawned through VVM programs.

---

## License

MIT
