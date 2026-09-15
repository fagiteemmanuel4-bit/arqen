# CLI

The ARQEN CLI is the first developer-facing integration surface for existing projects.

## Commands

| Command | Purpose | Mutation |
| --- | --- | --- |
| `arqen init` | Create local `.arqen/config.json` | yes, local config only |
| `arqen analyze` | Detect project structure and design signals | no |
| `arqen audit` | Run deterministic design audit | no |
| `arqen review` | Machine-oriented review envelope | no |
| `arqen diff` | Show proposed safe transformation edits | no |
| `arqen fix` | Build/apply the bounded transformation plan | dry-run by default |
| `arqen validate` | Validate a UIIR JSON document | no |

Every inspection command accepts `--json` for agent integrations.

The CLI deliberately does not expose a general `run`, `exec` or `generate-app` command. ARQEN is an interface intelligence tool, not a general coding agent.
