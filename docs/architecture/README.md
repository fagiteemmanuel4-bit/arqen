# Architecture

Arqen is organized as a modular monorepo. The boundaries below are intentional and should be preserved as the system grows.

## Apps

### `apps/studio`
The user-facing product studio. It owns navigation, workspace UX, responsive behavior, previews, and interaction with Arqen services.

## Packages

### `packages/design-system`
The canonical visual language: design tokens, primitives, components, patterns, states, and responsive rules.

### `packages/uiir`
The canonical contract for describing interfaces independent of a specific rendering technology.

### `packages/renderer`
Turns valid UIIR documents into the interactive React representation used by the studio and, later, generated projects.

### `packages/shared`
Small, stable contracts shared between packages and services. Keep this package dependency-light.

## Services

### `services/orchestrator`
Python service responsible for AI workflows, model routing, tool execution, structured generation, and later agent coordination.

## Key architectural rule

The model must not be the source of truth for the application's structure. Models propose structured artifacts; schemas validate them; deterministic systems render them.

```text
LLM
 ↓
Structured proposal
 ↓
Schema validation
 ↓
UIIR / product artifacts
 ↓
Deterministic renderer
 ↓
UI
```

This boundary is fundamental to reliability, editability, model portability, and future code generation.

## Mobile-first requirement

The studio is a first-class mobile/tablet experience. Responsive behavior must be designed into the workspace and generated interfaces rather than added after desktop implementation.
