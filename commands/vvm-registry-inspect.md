---
description: Inspect a remote workflow contract and cache metadata
argument-hint: <@handle/slug | https://...>
---

# VVM Registry Inspect

Inspect a remote workflow without running it. This command resolves a registry/URL module, applies cache and trust policy, and shows its input/output contract.

## Usage

```bash
/vvm-registry-inspect "@alice/research"
/vvm-registry-inspect "https://example.com/workflows/research.vvm"
```

## Flags

| Flag | Description |
|------|-------------|
| `--offline` | Disable network fetches for remote imports (cache-only mode) |
| `--cache-only` | Alias for `--offline` |

## Behavior

1. Resolve the source to a URL (registry shorthand uses `VVM_REGISTRY_BASE_URL`).
2. Enforce trust rules (`VVM_REGISTRY_REQUIRE_HTTPS`, allowlist/denylist).
3. Resolve module from cache/fetch policy:
   - Offline/cache-only: cache hit required, otherwise `E095`
   - Online: use fresh cache or fetch + cache
4. Validate cache integrity (`meta.json` hash vs `module.vvm`); mismatch is `E094`.
5. Parse module and extract contract from `input` and `export` declarations.

No top-level execution occurs. No agent calls are spawned.

## Output

```text
✅ Registry module inspect

Source:
  Requested: @alice/research
  Resolved URL: https://vvm.dev/alice/research.vvm

Cache:
  Status: hit (fresh)
  Path: .vvm/registry/https_vvm.dev__alice__research.vvm/a7b3c9d2e1f0/module.vvm
  Content hash: a7b3c9d2e1f0456789abcdef...
  Fetched at: 2026-03-14T09:12:44Z

Contract:
  Inputs:
    topic (required): "Topic to investigate"
    depth (optional = "medium")

  Outputs:
    report
    summary
```

## Common Errors

- `E091`: URL fetch failure or domain blocked
- `E092`: insecure `http://` import rejected
- `E093`: invalid URL format
- `E094`: cache integrity check failed
- `E095`: offline/cache-only cache miss
- `E090`: requested export/contract parse dependency could not be resolved

## Files to Read

- `skills/vvm/spec.md` - URL imports, cache policy, and error codes
- `skills/vvm/vvm.md` - Resolver and contract extraction semantics
