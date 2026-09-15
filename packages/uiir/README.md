# UIIR — User Interface Intermediate Representation

UIIR is Arqen's canonical, renderer-independent description of an interface.

The AI should propose UIIR. The renderer should validate and render UIIR. React/TypeScript source is an output format, not the source of truth.

## First milestone

The MVP schema covers:

- pages and screens
- navigation
- sections and layout regions
- component instances
- content/data bindings
- responsive behavior
- interaction intents
- visual states

## Design rule

UIIR describes **what the interface is**, not how React happens to implement it.

That keeps generated products editable, testable, portable across models, and suitable for later compilation into different runtimes.
