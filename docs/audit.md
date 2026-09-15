# Audit engine

ARQEN's deterministic audit engine turns project evidence into explainable findings. It does not claim to measure design quality objectively.

## Finding contract

Each finding contains:

- `id` — stable rule/index identifier for the audit run
- `category` — hierarchy, spacing, typography, color, density, consistency, responsive, accessibility, interaction, navigation, decoration, component architecture, or design system
- `severity` — critical, high, medium, low, or info
- `confidence` — a 0–1 estimate of how strongly the available static evidence supports the finding
- `risk` — potential risk of acting on the recommendation
- `evidence` — the observable signal that triggered the rule
- `files` — relevant source files when attribution is available
- `recommendation` — suggested review/action
- `potentialFix` — bounded implementation direction when one can be stated safely

## Score

The current score starts at 100 and subtracts fixed severity penalties (20/12/7/3/0). This is intentionally a prioritization signal, not a quality grade. Confidence does not secretly change the score; the evidence and severity remain inspectable.

## Safety principle

Static signals are not proof. For example, low counts of Tailwind responsive prefixes do not prove a page is non-responsive, and missing an `alt` attribute in JSX does not by itself establish that an image is meaningful. Rules should state their uncertainty and recommend verification where implementation context can change the conclusion.
