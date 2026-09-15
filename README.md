# Arqen

> A product compiler for turning human intent into professionally structured software.

Arqen is an AI-native software building platform designed around a simple principle: **understand the product before generating the code**.

The first milestone is the **Design Intelligence Engine**: product intent → UX structure → design language → UI Intermediate Representation (UIIR) → editable, responsive React interfaces.

## Vision

Arqen will progressively grow from a design intelligence system into an end-to-end software engineering platform capable of researching, designing, building, verifying, deploying, and operating software.

## Architecture direction

- **Studio:** React + TypeScript
- **AI orchestration:** Python
- **Design system:** token-driven, composable, responsive
- **UIIR:** structured intermediate representation between product intent and rendered UI
- **Renderer:** UIIR → reusable React components
- **Future:** backend/data modeling, sandboxed execution, QA, security, deployment, and continuous engineering

## Product principles

1. Understand before generating.
2. Design systems over one-off screens.
3. Structured representations over raw generated code.
4. Mobile and tablet are first-class clients.
5. Generated work must be inspectable, editable, testable, and reversible.
6. Prefer evidence and verification over claims of completion.
7. Keep the architecture model-agnostic.
8. Avoid generic AI-builder aesthetics and template-driven output.

## Initial milestone

**Arqen 0.1 — Design Intelligence Engine**

The first usable experience should turn a product idea into a coherent, editable product prototype with a reusable design system and clean React/TypeScript output.

## Repository structure

```text
apps/
  studio/                 # React + TypeScript product studio
packages/
  design-system/         # Arqen visual language and primitives
  uiir/                  # UI Intermediate Representation
  renderer/              # UIIR → React renderer
  shared/                # shared contracts and utilities
services/
  orchestrator/          # Python AI orchestration layer
docs/
  architecture/
  product/
  design/
```

This repository is intentionally starting small. Each capability will be introduced as a tested, composable system rather than as a large generated application.
