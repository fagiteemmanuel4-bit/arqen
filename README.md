# ARQEN

> Design intelligence for AI-generated software.

ARQEN is developer infrastructure for understanding, evaluating and improving existing software interfaces. It works alongside coding systems rather than replacing them.

## What exists now

The 0.2 foundation can:

- inspect an existing React / Next.js / Vite-style web project
- detect language, framework, package manager and styling approach
- parse TS/TSX with the TypeScript compiler API to extract component structure
- extract CSS custom-property design tokens and reuse signals
- produce evidence-based deterministic design audits
- validate versioned UIIR documents
- validate model-produced UIIR and recommendation artifacts before they cross into deterministic systems
- generate a constrained, dry-run transformation plan with backup/rollback semantics
- expose a model-provider abstraction for OpenRouter, OpenAI, Anthropic, Gemini and local OpenAI-compatible endpoints
- provide a CLI surface for `init`, `analyze`, `audit`, `review`, `fix`, `diff` and `validate`
- provide a public technical/product site under `apps/site`

The current analyzer is intentionally conservative. Visual browser analysis, repository mutation beyond the bounded transformation path, and autonomous code execution are not claimed as complete.

## Architecture

```text
Existing repository
       ↓
Project analyzer
       ↓
Framework-neutral domain model
       ↓
UIIR / evidence
       ↓
Deterministic audit ── optional model reasoning
       ↓
Schema validation boundary
       ↓
Recommendations
       ↓
Bounded transformation plan
       ↓
Diff / approval
       ↓
Validation
```

The model is a replaceable provider. ARQEN's durable value is its representations, rules, transformations, validation and developer workflow.

## Repository

```text
apps/
  studio/                 # product studio prototype
  site/                   # public ARQEN site
packages/
  core/                   # framework-neutral project/domain model
  design-system/          # canonical ARQEN visual tokens
  uiir/                   # versioned UI Intermediate Representation + schema artifact
  analyzer/               # source/project analysis + audit rules
  transform/              # bounded transformation plans
services/
  orchestrator/           # model provider routing + validated structured design endpoint
docs/
  architecture/
  product/
```

## CLI

From the repository root after installing workspace dependencies:

```bash
arqen init
arqen analyze .
arqen audit .
arqen review .
arqen diff .
arqen fix .
arqen validate ./uiir.json
```

Use `--json` for machine-readable output. `fix` is dry-run by default; `--apply` is explicit.

## Model providers

Set `ARQEN_PROVIDER` to `openrouter`, `openai`, `anthropic`, `gemini` or `local`. Credentials stay in environment variables. Provider responses are bounded, parsed and validated against the expected structured schema before ARQEN accepts them.

See `services/orchestrator/.env.example` and `docs/security.md`.

## Status

ARQEN is early infrastructure. The current release establishes the core project-analysis, UIIR, audit, provider and transformation boundaries. It is not yet a production visual-regression or autonomous remediation system.
