---
description: Validate and compile a VVM program
argument-hint: <file.vvm>
---

# VVM Compile

Validate a VVM program without executing it. This is static analysis only.

## Phases

1. **Parse** — Tokenize and build AST per grammar (E001-E005)
2. **Load Imports** — Resolve `from "path" import ...`, check files exist (E090, E032)
3. **Collect Declarations** — Gather agents, functions, skill imports, exports (E010-E031)
4. **Validate References** — Check `@agent` refs, `{placeholders}`, variables (E040-E052)
5. **Validate Control Flow** — Check return/break/continue/try structure (E050-E082)
6. **Warnings** — Non-blocking issues like unused variables (W001-W031)

## Output

**Success:**
```
✅ <file.vvm> is valid

Agents: <count>
Functions: <count>
Exports: <list>
```

**Error:**
```
❌ Validation failed

E0XX line N col C: description
  <source line>
  ^
```

If no file specified, search for `.vvm` files and prompt user to select.

## Files to Read

- `skills/vvm/spec.md` - Complete grammar and error definitions (Section 16)
