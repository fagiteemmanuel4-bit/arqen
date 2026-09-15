# Browser and visual intelligence

ARQEN now has a bounded browser-inspection layer in `packages/browser`.

## Evidence model

A browser inspection produces `VisualEvidence` for desktop, tablet and mobile viewports:

- screenshot path
- viewport and document dimensions
- measured horizontal overflow
- capped element bounding boxes and visibility
- Playwright ARIA snapshot data
- axe accessibility violations
- browser console errors
- failed network requests

Findings should reference this evidence rather than asserting an unsupported visual judgment.

## Security boundary

The first implementation intentionally accepts only `file://` targets inside an explicitly supplied `allowedRoot`. It does **not** start package scripts, dev servers, shells or arbitrary repository commands. Browser requests are intercepted and non-`file:` requests are aborted.

This is deliberate. A future build/start adapter must introduce a separate execution sandbox with explicit filesystem, process, network and credential boundaries. The browser package must never inherit arbitrary repository authority merely because a project contains a `package.json` or README instruction.

## Why Playwright

Playwright is a mature browser automation system with viewport emulation, screenshots, console/request events and ARIA snapshot APIs. Current Playwright documentation also notes that its older `page.accessibility` API has been removed; ARQEN therefore uses current ARIA snapshot APIs and axe-core for accessibility analysis rather than depending on a deprecated accessibility API.

Visual screenshots are evidence, not a quality score. A later visual-regression layer may compare screenshots, but ARQEN should report the comparison inputs, environment and diff rather than inventing a universal visual-quality number.

## Why axe-core

`@axe-core/playwright` provides a mature automated accessibility engine. ARQEN records violations as browser evidence. Automated accessibility testing is necessarily incomplete, so axe results do not replace manual or user testing.

## Current limitation

The browser layer can inspect safe static local fixtures. It cannot yet safely build and start arbitrary React/Next projects. Until a process sandbox exists, the CLI and analysis engine must continue to report browser execution as unavailable for arbitrary repositories rather than pretending the browser can run them.
