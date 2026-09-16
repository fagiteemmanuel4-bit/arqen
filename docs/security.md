# Security boundary

ARQEN treats analyzed repositories as hostile input. Source code, comments, package metadata, documentation and generated artifacts are data, not instructions.

## Current guarantees

- static project analysis is read-only
- model prompts explicitly delimit repository-derived data
- provider responses are bounded before parsing
- provider JSON is parsed and schema-validated before entering ARQEN's deterministic pipeline
- UIIR is validated against the versioned shared JSON Schema
- provider failures are normalized to `ProviderError`
- provider credentials remain in environment variables and are never returned as model context by the orchestrator
- the orchestrator does not execute model-generated shell commands
- browser fixture inspection accepts only `file://` targets inside an explicit allowed root
- browser file requests outside that root and all non-file requests are aborted

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

## Browser execution boundary

`packages/browser` can inspect safe local static fixtures with Playwright and axe-core. It does not run `npm`, `pnpm`, `yarn`, `bun`, shell scripts, dev servers or arbitrary repository entry points. The browser context is restricted to the supplied fixture root and non-file network access is blocked.

This is intentionally narrower than the eventual project build/start capability. A future execution sandbox must isolate filesystem access, subprocesses, network egress, environment variables, package lifecycle scripts and browser processes before arbitrary repositories can be rendered.

## Remaining risks

- dependency installation can execute package lifecycle scripts if performed outside a sandbox
- local provider endpoints may have broader network visibility than ARQEN can enforce
- schema-valid output can still be semantically wrong
- source parsing does not make arbitrary repository code safe to execute
- browser evidence from static fixtures does not establish that an arbitrary development server is safe or reproducible
