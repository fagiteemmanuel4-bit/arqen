# Security boundary

ARQEN treats analyzed repositories as hostile input. Source code, comments, package metadata, documentation and generated artifacts are data, not instructions.

## Current guarantees

- static project analysis is read-only
- model prompts explicitly delimit repository-derived data
- provider responses are bounded before parsing
- provider JSON is parsed and schema-validated before entering ARQEN's deterministic pipeline
- UIIR is validated against the versioned canonical JSON Schema
- provider failures are normalized to `ProviderError`
- provider credentials remain in environment variables and are never returned as model context by the orchestrator
- the orchestrator does not execute model-generated shell commands

## Model output boundary

The trust boundary is:

```text
MODEL
  ↓
bounded text response
  ↓
JSON extraction
  ↓
JSON Schema validation
  ↓
normalized structured artifact
  ↓
ARQEN deterministic systems
```

A schema-valid model response is still not authoritative product truth. Evidence and inference remain separate, and transformations require their own bounded validation.

## Browser execution limitation

ARQEN does not currently execute arbitrary analyzed repositories inside the orchestrator. Browser execution, when introduced, must use a separate sandbox with explicit filesystem, process and network boundaries. Until that exists, static analysis must not claim observed browser behavior.

## Remaining risks

- dependency installation can execute package lifecycle scripts if performed outside a sandbox
- local provider endpoints may have broader network visibility than ARQEN can enforce
- schema-valid output can still be semantically wrong
- source parsing does not make arbitrary repository code safe to execute
