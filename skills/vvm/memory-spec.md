---
role: spec-extension
summary: |
  Minimal, VVM-native semantics for agent memory (persistent agents) with
  portable behavior, explicit controls, inspectable files, and safe concurrency.
see-also:
  - spec.md
  - vvm.md
  - patterns.md
---

# Agent Memory (MVP Spec): Digest + Ledger

This is the **final MVP design** for persistent agents in VVM.

VVM programs run as prompts: there is no background process, “sleep”, or daemon. So persistence must be realized via **explicit file-backed memory** that the runtime loads into each agent call, and updates after the call.

---

## Goals (MVP)

- **Portable semantics**: persistence works regardless of whether the host has native persistent subagents.
- **Explicitness**: authors can see when memory is used vs ignored.
- **Inspectable state**: memory is readable/editable outside the runtime.
- **Boundedness**: memory grows, but the system remains usable (compaction, segmentation).
- **Safety by default**: hard to accidentally persist secrets; easy to scope memory.
- **Concurrency rules**: avoid corrupting memory under `pmap` and future parallelism.

## Non-goals (MVP)

- Solving long-term memory *retrieval* optimally (vector DB, KG, etc.) in the spec.
- Perfect reproducibility across models (persistent state is inherently history-dependent).
- A full durable-execution system for *resuming a program counter* (separate feature; LangGraph territory).

---

## 1. Core model (conceptual)

Agent memory is a durable directory with two layers:
- **Digest** (`digest.md`): small, editable, token-bounded “core memory” (the compact state you actually want injected).
- **Ledger** (`ledger.jsonl`): append-only history of memory updates (“what we decided to remember”), rebuildable views, and diagnostics.

The runtime always injects **Digest** (and optionally a bounded slice of Ledger-derived facts) into the prompt for stateful calls.
The runtime only updates memory via an **explicit memory patch** emitted by the agent.

Design intent:
- Digest is what you want the model to “be” next time.
- Ledger is why Digest is that way (and a place to store additional retained facts safely).

### 1.1 What goes in `digest.md` (guidance)

`digest.md` is the **working set**: information you want injected on every stateful call because it has high expected value.

Put in the digest:
- **Stable facts** that will matter repeatedly (high signal, low volatility).
- **Preferences / norms** (e.g., formatting, tone, strictness) that should apply by default.
- **Constraints** (policies, invariants, “do not do X”) that should be present every time.
- **Current focus + what’s next**: a small, current list of open loops / next actions.

Keep out of the digest:
- raw transcripts, long chat logs, or large copied artifacts
- time-sensitive details that will go stale quickly (unless they’re part of “current focus”)
- secrets / tokens / credentials / private keys

Rule of thumb (“promotion”):
- If you want it **always loaded**, it belongs in `digest.md`.
- If you want it **findable later** but not always loaded, it belongs in `retain` → `ledger.jsonl`.

Recommended structure (optional, not required):

```md
## Stable
- W ... (durable facts)

## Preferences
- O(c=...) ... (preferences/norms)

## Next
- N ... (open loops / follow-ups)

## Notes
- Short glossary / constraints / pointers
```

### 1.2 What goes in `ledger.jsonl` (guidance)

`ledger.jsonl` is the **audit trail + long tail**: an append-only record of what was retained and how the digest evolved.

Put in the ledger (via `retain`):
- narrative, self-contained facts (W/B/O/N) with `@Entity` mentions
- “why” behind digest changes (captured implicitly because the patch that changed digest is logged)
- short-lived items that are useful for near-term continuity but shouldn’t live forever in the digest

Keep out of the ledger (MVP):
- raw user inputs and raw agent outputs (the spec explicitly avoids transcript persistence)
- secrets (patches containing likely secrets must be rejected)

This is inspired by prior art, but deliberately VVM-shaped: minimal syntax, explicit evaluation, and no hidden background work.

Non-normative inspirations:
- Prose: inspectable, scoped persistence.
- Letta: small pinned “core” memory; explicit writes.
- Hindsight: retain/recall/reflect framing and evidence mindset (not mandated here).
- Clawdbot notes: Markdown-first workflows + rebuildable derived index.

---

## 2. Language surface (minimal)

### 2.1 Agent key: `memory=...`

Agents MAY specify a `memory` binding:

```vvm
agent helper(
  model="sonnet",
  prompt="Helpful, practical.",
  memory={ scope: "project", key: "user:alice" },
)
```

`memory` is an object with keys:
- `scope`: `"project" | "user" | "path"`
- `key`: a string identifying the durable memory instance
- `path`: required iff `scope=="path"` (string path to the memory directory root)

Notes:
- The **agent name is not memory identity**. Identity is `(scope, key)` so one agent template can serve many users/tenants safely.

### 2.2 Call option: `memory_mode=...`

Stateful agent calls accept an override option:

```vvm
reply = @helper `Help with {}.`(question)  # default: uses memory (continue)
temp  = @helper `Try a fresh approach.`(question, memory_mode="fresh")
audit = @helper `Answer without updating memory.`(question, memory_mode="dry_run")
```

Valid values:
- `memory_mode="continue"` (default): read memory, then write updates
- `memory_mode="dry_run"`: read memory, do not write anything
- `memory_mode="fresh"`: do not read and do not write memory (equivalent to stateless execution)

`memory_mode` is only meaningful if a `memory` binding exists (either on the agent or via host-defined mechanisms). If no memory is bound, runtimes SHOULD ignore `memory_mode`.

---

## 3. Runtime semantics (normative)

### 3.1 Memory directory resolution

Given `memory={scope:S, key:K, path:P?}`, the runtime resolves a memory directory `D`:
- `S=="project"` → `D = <project>/.vvm/memory/<escape(K)>`
- `S=="user"`    → `D = ~/.vvm/memory/<escape(K)>`
- `S=="path"`    → `D = P/<escape(K)>` (or `D=P` if `P` is already key-specific; host-defined)

`escape(K)` MUST be a reversible encoding that is safe for filesystem paths.

### 3.2 Memory files (portable minimum)

The portable minimum representation is:
- `D/digest.md` (UTF-8 text; may be empty)
- `D/ledger.jsonl` (append-only JSON Lines)
- `D/meta.json` (optional; schema version, created_at, last_used_at)
- `D/lock` (optional; for single-writer locking; see Section 6)

Runtimes MAY add derived files, including (examples):
- `D/journal/YYYY-MM-DD.md` (optional human-readable view of the ledger)

Runtimes MUST preserve the meaning of the portable minimum files.

### 3.3 Loading memory into an agent call

When evaluating an agent call with `memory_mode="continue"` or `"dry_run"`:
1. Load `digest.md` (or treat as empty if missing).
2. Optionally load a **token-budgeted** slice of memory facts derived from `ledger.jsonl` (at minimum, a recent tail of `retain` items if present).
3. Construct a **Memory Context** string:
   - include the digest verbatim
   - include the selected retained facts in a compact, readable form
4. Prepend the Memory Context to the call’s rendered task prompt.

Ergonomics: the Memory Context MUST include a short reminder of the `vvm-memory` patch format so authors don’t need to repeat the protocol in every agent prompt.

The retrieval algorithm beyond “recent tail” is intentionally unspecified. Implementations MAY do keyword/semantic retrieval, but the spec only requires:
- **bounded size** (token-budgeted),
- **deterministic enough** to be debuggable (inspectable inputs),
- **bias toward recency** (to preserve conversational continuity).

Safety note: the runtime MUST NOT persist raw user input or raw agent output by default (see Section 5).

### 3.4 Applying a memory update

For `memory_mode="continue"` only, after the subagent returns:
1. Extract any memory patch (Section 4) and separate **user-visible output** from patch data.
2. Validate the patch (size limits; secret scanning; schema).
3. If valid, apply it:
   - update `digest.md` (atomic write)
   - append a ledger entry capturing the patch (append-only)
4. Update `meta.json` (best-effort): `last_used_at`, `last_mode`.

For `memory_mode="dry_run"` and `"fresh"`, runtimes MUST NOT write to `digest.md` or `ledger.jsonl` (but MAY update `meta.json` with `last_used_at` / `last_mode`).

---

## 4. Memory patches (tiny, safe channel)

Memory updates are not “the agent edits files”. Memory updates are a **single structured block** that the runtime can validate and apply.

### 4.1 Patch envelope

If the agent output contains a fenced code block with info string `vvm-memory`, the runtime MUST treat its contents as a JSON object:

````text
...user visible text...

```vvm-memory
{
  "digest": "...",
  "retain": [
    "O(c=0.95) @Peter: Prefers concise replies; long content goes into files.",
    "N @Peter: Keep replies under ~1500 chars; write longer content into a file."
  ]
}
```
````

Rules:
- The runtime MUST strip the entire `vvm-memory` block from the returned string value of the agent call.
- If the JSON is invalid, runtimes SHOULD ignore it and still return the user-visible text (and SHOULD record a warning in the ledger entry if writing).

### 4.2 Patch schema (MVP)

Supported keys (all optional):
- `digest` (string): the new full digest contents to write to `digest.md`
- `retain` (list of strings): 0–N “narrative facts” to attach to the current ledger entry for later recall

That’s it for MVP. Everything else belongs in the ledger (ground truth) or in future extensions.

### 4.3 Safety requirements (MVP)

Runtimes MUST enforce:
- a maximum digest size (token or byte limit)
- a maximum retain size (count and per-item size)
- atomic write semantics for digest updates (write temp + rename)
- single-writer behavior for a given `D` (lock or best-effort; see Section 6)

Runtimes SHOULD enforce:
- refusal to store obvious secrets (API keys, private keys, tokens) in `digest` or `retain`
- schema versioning via `meta.json`

---

## 5. Safety by default (normative)

### 5.1 Explicit memory, not transcript persistence

To make it hard to accidentally persist secrets:
- The runtime MUST NOT persist raw call inputs or raw agent outputs as part of this memory system.
- The only durable writes in MVP are `digest.md` updates and `ledger.jsonl` entries derived from the `vvm-memory` patch.

If an application wants transcript logging, it should implement it separately with explicit opt-in and its own security model.

### 5.2 Scoping is the primary safety mechanism

Authors SHOULD scope memory narrowly by choosing keys intentionally:
- per-user: `key="user:alice"`
- per-ticket/thread: `key="user:alice/ticket:INC-1234"`
- per-project role: `key="project:my-repo/reviewer"`

### 5.3 Secret scanning behavior

If the runtime detects likely secrets inside a proposed patch, it MUST reject the patch (write nothing) and still return the user-visible output.
It SHOULD append a ledger warning entry if doing so does not leak the secret itself.

---

## 6. Concurrency rules (normative)

### 6.1 Single-writer discipline

For a given memory directory `D`, the runtime MUST prevent concurrent writes that can corrupt state.

Minimum requirement:
- `memory_mode="continue"` MUST acquire an exclusive lock for `D` across the whole operation (load → run agent → validate patch → apply patch).

Recommended:
- `memory_mode="dry_run"` SHOULD also acquire a lock (shared if available; exclusive otherwise) to avoid reading half-written state.

### 6.2 Lock failure behavior

If the runtime cannot acquire the lock within an implementation-defined timeout, it MUST return an error value (e.g., `error(kind="locked")`) rather than proceeding unsafely.

### 6.3 Parallelism guidance

Under `pmap`, authors SHOULD avoid sharing a single memory key across parallel calls unless they intentionally want serialization.
Use one of:
- distinct `memory.key` per parallel worker,
- `memory_mode="fresh"` for parallel “map” work,
- an explicit merge step that writes a single patch after parallel computation.

---

## 7. Boundedness (normative)

### 7.1 What’s bounded

Runtimes MUST keep:
- injected memory context token-bounded,
- `digest.md` size-bounded,
- patch size bounded (`digest` + `retain`).

### 7.2 Compaction via digest

Compaction is “rewrite the digest to be smaller and more useful”.
In MVP, compaction is achieved by:
- the agent emitting a new `digest` (explicit),
- or humans editing `digest.md` directly (inspectable).

### 7.3 Segmentation via ledger

The Digest/Ledger split is the primary segmentation mechanism.
Runtimes MAY additionally rotate `ledger.jsonl` into segments (e.g., per-day files under `journal/`), as long as `ledger.jsonl` remains the authoritative append-only record or can be reconstructed.

---

## 8. Usage patterns (informative)

### 8.1 Multi-tenant agents

```vvm
agent tutor(model="sonnet", prompt="Socratic, patient.", memory={ scope: "project", key: "user:alice" })
agent tutor_bob(model="sonnet", prompt="Socratic, patient.", memory={ scope: "project", key: "user:bob" })

a = @tutor `Help me learn Rust borrowing.`(it)
b = @tutor_bob `Help me learn Rust borrowing.`(it)
```

### 8.2 “New thread” without new features

Threads are just keys:

```vvm
agent support(model="sonnet", prompt="Support agent.", memory={ scope: "project", key: "user:alice/ticket:INC-1234" })
reply = @support `Resolve this ticket.`(ticket)
```

If you want a new conversation, pick a new key. If you want long-term continuity, reuse the key.

### 8.3 Retain bullets (recommended convention)

If you use `retain`, keep each item:
- self-contained (reads sensibly out of context),
- narrative (captures the “why”, not just a keyword),
- attributable (mention entities; avoid ambiguous pronouns).

A lightweight, Markdown-friendly convention (inspired by the Clawdbot notes) is:
- `W …` for “world fact”
- `B …` for “what happened / what we did”
- `O(c=0.0..1.0) …` for “opinion/preference with confidence”
- `N …` for “what’s next / follow-up” (open loop; keep current ones in the digest)
- `@Entity` mentions for entity-centric recall

---

## 9. Notes on retrieval (non-normative)

This spec intentionally does NOT standardize vector DBs, knowledge graphs, or “optimal recall”.
However, it is compatible with simple, portable approaches such as:
- scanning `ledger.jsonl` / `journal/` for matches (lexical) and injecting a bounded slice
- maintaining a host-specific derived index (rebuildable) to speed up lexical/semantic recall

Whatever the host does, it must still produce a bounded, inspectable Memory Context and preserve the canonical Digest/Ledger files.
