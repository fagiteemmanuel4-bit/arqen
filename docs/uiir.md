# UIIR 0.2

UIIR is ARQEN's framework-neutral interface representation.

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
- unknown future fields should be ignored by consumers where safe
- invalid documents must not reach deterministic rendering or transformation without validation

UIIR is intentionally smaller than a full browser DOM. It represents product-relevant interface intent and evidence rather than every implementation detail.

## Future extensions

The next schema work should add explicit navigation graphs, semantic content hierarchy, token provenance, visual geometry and validation metadata only when a real engine capability needs them.
