# Architecture

ARQEN is a modular monorepo. Boundaries are intentional and should remain visible as the system grows.

## Core layers

### `packages/core`
Framework-neutral domain contracts for projects, source files, frameworks, routes, screens, components, tokens, layouts, interactions, state, responsive behavior and accessibility signals.

### `packages/uiir`
The versioned interface intermediate representation. UIIR is the contract between reasoning and deterministic rendering/validation. It is not a React component model.

### `packages/analyzer`
Read-only project understanding. Framework adapters and source parsers turn repository evidence into the core domain model. React/TSX currently uses the TypeScript compiler API rather than regex-only parsing.

### `packages/transform`
Explicit, bounded transformation plans. Plans carry exact before/after source, reason and risk. Application verifies the original source before writing and creates a local backup for rollback.

### `packages/design-system`
Canonical ARQEN visual tokens and primitives. This package is independent from analyzed projects; it describes ARQEN itself, not a project's extracted design system.

### `services/orchestrator`
Python model orchestration. Provider adapters normalize OpenRouter/OpenAI-compatible, Anthropic and Gemini structured generation behind one interface. The domain does not depend on a vendor.

### `apps/studio`
Current product studio prototype. It is allowed to evolve independently from the analysis engine.

### `apps/site`
Public technical/product presence. It must only describe implemented capabilities.

## Fundamental boundary

```text
Repository
   ↓
Parser / framework adapter
   ↓
Core domain evidence
   ↓
UIIR + audit engine
   ↓
Model reasoning (optional)
   ↓
Validated recommendation
   ↓
Transformation plan
   ↓
Human-approved application
```

Models propose. Schemas validate. Deterministic systems decide what can be safely applied.

## Security boundary

Analysis is read-only by default. Repository paths are not executed. Future command execution, browser rendering and sandboxing must run in an isolated capability boundary and never inherit arbitrary host credentials.

## Why TypeScript + Python

TypeScript is the natural host for JavaScript/TypeScript source understanding, UIIR consumers and the developer CLI. Python remains the orchestration layer because model/provider workflows and future analysis services can evolve independently. Neither language is allowed to become the product boundary.
