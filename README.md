# ARQEN

> Design intelligence for AI-generated software.

ARQEN is developer infrastructure for understanding, evaluating and improving existing software interfaces. It works alongside coding systems rather than replacing them.

## What exists now

The current foundation can:

- inspect an existing React / Next.js / Vite-style web project
- detect language, framework, package manager and styling approach
- parse common React/TypeScript component patterns with the TypeScript compiler API, including arrow functions, function expressions, default exports, wrappers and class components
- extract CSS custom-property design tokens, repeated raw values and repeated component patterns
- produce evidence-based deterministic design audits with `CERTAIN`, `LIKELY` and `POSSIBLE` evidence levels
- detect static accessibility and responsive risks without claiming browser-observed behavior
- validate versioned UIIR through the same JSON Schema used by the Python orchestrator
- validate model-produced UIIR and recommendation artifacts before they cross into deterministic systems
- generate a constrained transformation plan with reason, expected outcome, risk, confidence and validation strategy; `fix` remains dry-run by default
- expose a model-provider abstraction for OpenRouter, OpenAI, Anthropic, Gemini and local OpenAI-compatible endpoints
- provide CLI commands for `init`, `analyze`, `audit`, `review`, `fix`, `diff` and `validate`, with JSON output where appropriate
- inspect safe local static fixtures in Chromium at desktop, tablet and mobile viewports, producing screenshots, dimensions, overflow measurements, ARIA snapshots, axe accessibility results, console errors and failed-request evidence
- maintain a regression fixture suite, including a realistic `movie-site-fixture`

## What is deliberately not claimed

ARQEN does not yet safely build and start arbitrary repositories inside a process sandbox. The browser layer currently accepts only explicitly allowed local `file://` fixtures and blocks non-file browser requests. It does not execute repository scripts or model-generated shell commands.

ARQEN is not yet a production visual-regression or autonomous remediation system. Browser evidence is real, but visual quality scoring and autonomous browser-driven fixes are intentionally not fabricated.

## Architecture

```text
Existing repository
       ↓
UNDERSTAND → PARSE → GRAPH
       ↓
UIIR → DESIGN SYSTEM
       ↓
DETERMINISTIC AUDIT
       ↓
optional model reasoning
       ↓
validated recommendation
       ↓
bounded transformation plan
       ↓
DIFF / APPROVAL
       ↓
VALIDATE
       ↓
REPORT / evidence
```

The model is a replaceable provider. ARQEN's durable value is its representations, rules, transformations, validation and developer workflow.

## Repository

```text
apps/
  cli/                    # developer CLI
  studio/                 # product studio prototype
  site/                   # public ARQEN site
packages/
  core/                   # framework-neutral project/domain model
  design-system/          # canonical ARQEN visual tokens
  uiir/                   # versioned UI Intermediate Representation + shared JSON Schema
  analyzer/               # source analysis + deterministic audit rules
  browser/                # bounded Playwright/axe evidence capture
  transform/              # bounded transformation plans
services/
  orchestrator/           # model provider routing + validated structured design endpoint
fixtures/                 # deterministic analyzer/browser regression targets
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
arqen fix .
arqen diff .
arqen validate ./uiir.json
arqen validate ./fixtures/movie-site-fixture --json
```

Use `--json` for machine-readable output. `fix` is dry-run by default; `--apply` is explicit. Project validation truthfully reports browser execution as `not-run` unless a browser evidence workflow is explicitly invoked.

## Model providers

Set `ARQEN_PROVIDER` to `openrouter`, `openai`, `anthropic`, `gemini` or `local`. Credentials stay in environment variables. Provider responses are bounded, parsed and validated against the expected structured schema before ARQEN accepts them.

See `services/orchestrator/.env.example`, `docs/security.md` and `docs/visual-intelligence.md`.

## Status

ARQEN is early developer infrastructure. The current release establishes stronger project analysis, shared UIIR validation, deterministic audit evidence, fixture regression coverage, bounded transformations and real browser evidence for safe static fixtures. The next security boundary is a sandboxed project build/start capability; until that exists, ARQEN will not pretend arbitrary repositories are runnable.
