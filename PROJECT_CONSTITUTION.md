# ARQEN Project Constitution

## Mission

ARQEN provides design intelligence for AI-generated software. It improves existing software through understanding, evidence, structured recommendations and bounded transformations.

## Non-goals

ARQEN is not a general coding agent, website builder, model wrapper, or replacement for developer agents.

## Architectural invariants

1. The model is replaceable. Provider credentials and model names must never become domain assumptions.
2. Structured representations are the boundary between reasoning and deterministic systems.
3. Existing repositories are untrusted input. Analysis must default to read-only behavior.
4. Transformations are explicit, reviewable, bounded and reversible.
5. Framework-specific parsing belongs in adapters; design intelligence operates on framework-neutral domain data.
6. Evidence accompanies findings. A score without evidence is not an audit.
7. Mobile, responsive behavior and accessibility are first-class design concerns.
8. Unsupported technologies must be reported as unsupported rather than silently treated as supported.
9. Security and correctness outrank demo polish.
10. Public claims must match implemented capabilities.

## Current supported wedge

The 0.2 implementation focuses on React/Next.js/Vite-style web projects using TypeScript/JavaScript, CSS and Tailwind conventions. Static analysis is read-only. The CLI exposes project analysis, deterministic design audits, UIIR validation and a constrained dry-run transformation path.

## Representation layers

```text
Repository
  ↓
Source understanding
  ↓
Framework-neutral project model
  ↓
UIIR
  ↓
Deterministic audit + optional model reasoning
  ↓
Recommendation
  ↓
Bounded transformation plan
  ↓
Diff / approval
  ↓
Validation
```

The UIIR and core domain models are not React components. React is an adapter and rendering target.

## Change policy

Prefer small changes with explicit risk. Never let a model directly write arbitrary repository files without a validated transformation boundary. Any future execution or sandbox capability must be isolated from the analysis process.
