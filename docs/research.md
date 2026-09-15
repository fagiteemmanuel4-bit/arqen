# Research notes

## Browser evidence

### Playwright

ARQEN uses Playwright as the first browser evidence engine because it provides viewport emulation, screenshots, console/request events and current ARIA snapshot APIs. Current Playwright releases have removed the older `page.accessibility` API, so ARQEN does not build on that deprecated interface.

Relevant references:
- https://playwright.dev/docs/api/class-page
- https://playwright.dev/docs/api/class-locator
- https://playwright.dev/docs/test-snapshots

### axe-core

ARQEN uses `@axe-core/playwright` for browser accessibility evidence. Axe can identify many common WCAG problems, but its results are not a complete accessibility assessment; incomplete cases still require human review.

Relevant references:
- https://playwright.dev/docs/accessibility-testing
- https://github.com/dequelabs/axe-core

## Architecture decision

Browser evidence is deliberately separated from source analysis:

```text
Source analysis
  → static finding / possible risk

Browser inspection
  → observed runtime evidence

A later reconciliation layer
  → finding supported by source + runtime evidence
```

The first browser implementation is restricted to local `file://` fixtures inside an explicit allowed root. It never launches package scripts, shells or arbitrary repository processes. This keeps browser work useful while the stronger process sandbox required for arbitrary React/Next builds is still absent.

## Visual comparison

Screenshot comparison is not implemented as a universal quality score. Playwright's screenshot assertions can compare stable baselines, but rendering depends on browser version, OS, hardware and environment. ARQEN should therefore retain viewport/environment metadata and expose measurable diffs rather than inventing a cross-environment visual-quality number.
