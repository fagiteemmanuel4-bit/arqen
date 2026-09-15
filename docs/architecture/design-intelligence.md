# Design Intelligence Engine

ARQEN audits interfaces with a hybrid approach. Deterministic analysis establishes facts; heuristics interpret repeated patterns; model reasoning is optional and must consume structured evidence.

## Evidence model

A finding contains:

- stable rule identifier
- severity
- category
- concrete evidence
- recommendation
- affected files when known

This makes findings testable and suitable for CLI, API and future agent integrations.

## Current deterministic signals

The first audit engine covers:

- repeated rounded containers
- gradient density
- shadow density
- arbitrary spacing values
- action hierarchy signals
- responsive utility coverage
- image alternative text
- form control accessible names
- explicit CSS token presence and reuse

These are signals, not declarations that a product is objectively good or bad. Context-sensitive rules must remain conservative.

## Anti-pattern policy

ARQEN evaluates characteristics associated with weak generated interfaces. It must never claim to detect whether AI authored the code. A human can produce the same pattern, and a model can produce a strong interface.

## Scoring

The current score is a diagnostic summary derived from finding severity. It is intentionally simple while the rule corpus is small. Scores should not be presented as a universal design quality metric.

## Next intelligence layers

1. richer CSS/Tailwind token extraction
2. route and component graph analysis
3. semantic JSX and accessibility analysis
4. visual rendering across viewports
5. model-assisted contextual review
6. regression-aware validation
