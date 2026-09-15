# UIIR 0.2

UIIR is ARQEN's framework-neutral interface representation.

## Canonical schema strategy

The TypeScript UIIR domain model in `packages/uiir/src/schema.ts` is the canonical domain definition. The versioned JSON Schema at `packages/uiir/schema/uiir-0.2.0.schema.json` is the interoperability artifact consumed by the Python orchestrator and external tooling.

When the TypeScript domain model changes, the JSON Schema artifact must be regenerated or deliberately versioned in the same change. The orchestrator must never maintain a second hand-written UIIR schema.

The Python boundary validates every model-produced UIIR artifact against the versioned JSON Schema before returning it to callers.

## Required top-level structure

- `version`
- `project`
- `product`
- `designSystem`
- `screens`

Screens contain regions. Regions contain components. Components can describe layout, typography, responsive behavior, states, interactions and accessibility metadata.

## Stability rules

- schema versions are explicit
- IDs must be stable within a document
- routes must be absolute application routes
- validation is strict for fields defined by the current schema
- unknown fields are not silently accepted at the trust boundary; future fields require a schema version or explicitly documented extension point
- invalid documents must not reach deterministic rendering or transformation without validation

UIIR is intentionally smaller than a full browser DOM. It represents product-relevant interface intent and evidence rather than every implementation detail.

## Compatibility testing

The orchestrator test suite covers valid documents, missing required fields, unknown top-level fields, version mismatches, fenced JSON responses and bounded response size. These tests run without provider credentials.
