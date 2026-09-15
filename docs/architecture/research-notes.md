# Research notes

ARQEN's foundational implementation was informed by public developer tooling rather than copied from a single system.

## Parsing and source transformation

- TypeScript compiler API / TypeScript: native AST access for TSX and TypeScript.
- Tree-sitter TypeScript and CSS: incremental grammar-based parsing is a strong future option for polyglot parsing and syntax-preserving evidence.
- ts-morph: useful higher-level TypeScript AST manipulation model.
- ast-grep: structural matching and rewriting with AST semantics.
- jscodeshift / recast: codemod workflows that preserve source formatting.
- OpenRewrite: recipe/visitor architecture and minimally invasive transformations.
- Biome: parser + tooling architecture for web projects.
- ESLint: rule-based diagnostics and source evidence patterns.

## Design, accessibility and validation

- axe-core: deterministic accessibility rules.
- Lighthouse: broad web quality auditing and browser-backed evidence.
- React Aria: accessible interaction patterns.
- React Testing Library: user-facing interaction semantics.
- Storybook: component/state isolation and testable UI surfaces.
- Playwright: browser automation, viewport control and screenshots for the future visual layer.
- Chromatic and Percy: visual regression workflow references.
- webhint: web-quality and accessibility rule organization.

## Agent and model interoperability

- Model Context Protocol: a useful standard boundary for agent-facing tools/resources.
- OpenAI developer tooling: structured model outputs and tool-oriented workflows.
- Anthropic tooling: model/tool separation and structured message contracts.
- Google Gen AI: schema-constrained structured output.
- OpenRouter: multi-provider routing and model portability.
- Continue, Aider, Cline, OpenHands and SWE-agent: useful reference points for agent integration boundaries; ARQEN deliberately does not adopt their coding-agent responsibility.

## Design-system representation

- W3C Design Tokens work: useful semantic token vocabulary direction.
- Style Dictionary: token transformation and cross-platform representation patterns.
- Tailwind CSS theme variables: practical evidence source for token extraction in utility-first projects.
- Radix UI and React Aria: evidence that accessibility and component semantics should be represented independently of visual styling.

## Decision

The implementation uses the TypeScript compiler API for the current React/TSX analyzer because the repository's first wedge is JavaScript/TypeScript. Tree-sitter remains the preferred expansion path when ARQEN needs a unified multi-language parser layer. Transformations are currently conservative source edits; AST codemods will be added when a concrete transformation rule benefits from syntax-aware rewriting.
