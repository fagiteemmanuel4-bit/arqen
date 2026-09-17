# CLI

The ARQEN CLI is the first developer-facing integration surface for existing projects.

## Commands

| Command | Purpose | Mutation |
| --- | --- | --- |
| `arqen init` | Create local `.arqen/config.json` | yes, local config only |
| `arqen analyze` | Detect project structure and design signals | no |
| `arqen audit` | Run deterministic design audit | no |
| `arqen inspect` | Capture runtime evidence at desktop/tablet/mobile viewports | no |
| `arqen review` | Machine-oriented review envelope | no |
| `arqen diff` | Show proposed safe transformation edits | no |
| `arqen fix` | Build/apply the bounded transformation plan | dry-run by default |
| `arqen validate` | Validate a UIIR JSON document or project checks | no |

## Runtime inspection

`arqen inspect ./project --json` captures three viewport passes. If the target contains `index.html`, ARQEN uses the bounded local-file browser path. For application projects, use `arqen inspect ./project --serve --json` to build and start the project inside the sandbox, then inspect its localhost origin.

Each runtime pass records screenshots, document dimensions, horizontal overflow, layout measurements, an ARIA snapshot, axe accessibility violations, console errors and failed requests. `--strict` turns any runtime evidence failure into a non-zero exit code.

`arqen fix --apply` always re-analyzes the project after mutation and rejects a transformation that lowers the deterministic audit score. Add `--runtime` when the project has a local HTML entry that should also pass browser validation.

Every inspection command accepts `--json` for agent integrations. Errors use a stable code/message/details/suggestion envelope in JSON mode.

The CLI deliberately does not expose a general `run`, `exec` or `generate-app` command. ARQEN is an interface intelligence tool, not a general coding agent.

<!-- usability-pass-verified -->
