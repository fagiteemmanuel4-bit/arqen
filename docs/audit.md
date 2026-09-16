# Audit engine

ARQEN's deterministic audit engine turns project evidence into explainable findings. It does not claim to measure design quality objectively.

## Finding contract

Each finding contains:

- `id` — stable rule/index identifier for the audit run
- `category` — hierarchy, spacing, typography, color, density, consistency, responsive, accessibility, interaction, navigation, decoration, component architecture, or design system
- `severity` — critical, high, medium, low, or info
- `confidence` — a 0–1 estimate of how strongly the available evidence supports the finding
- `certainty` — `CERTAIN`, `LIKELY`, or `POSSIBLE`, describing how directly the rule can establish the condition
- `risk` — potential risk of acting on the recommendation
- `evidence` — the observable signal that triggered the rule
- `files` — relevant source files when attribution is available
- `recommendation` — suggested review/action
- `potentialFix` — bounded implementation direction when one can be stated safely

## Evidence levels

Static analysis must distinguish a source-level risk from an observed browser fact.

- `CERTAIN` means the source evidence directly establishes the condition under the rule, such as an unlabeled button with no detectable accessible name.
- `LIKELY` means the evidence strongly suggests a problem but implementation context may change the result.
- `POSSIBLE` means the rule is a useful review signal and should not be treated as proof.

For example, a fixed `width: 980px` is a **potential mobile overflow risk**. It is not an observed overflow. Browser evidence can later say **observed horizontal overflow at 390px** because the browser measured the rendered document.

## Current deterministic coverage

The analyzer currently emits static signals for:

- rounded-container, gradient and shadow concentration
- arbitrary spacing values
- action-variant review
- limited responsive signals
- large fixed-width and overflow-clipping risks
- missing image alternative-text signals
- form-control naming signals
- unlabeled buttons
- missing explicit focus-state signals
- weak generic link names
- heading-level jumps
- repeated component patterns
- design-token presence and reuse

Rules deliberately use language such as “may”, “potential”, and “review” when the evidence cannot prove the visual or runtime outcome.

## Score

The current score starts at 100 and subtracts fixed severity penalties (20/12/7/3/0). This is intentionally a prioritization signal, not a quality grade. Confidence does not secretly change the score; the evidence, certainty and severity remain inspectable.

## Safety principle

Static signals are not proof. Browser evidence and accessibility tooling are separate evidence sources, not replacements for the deterministic source analyzer. Automated accessibility tools can find many common violations but do not establish complete accessibility conformance.
