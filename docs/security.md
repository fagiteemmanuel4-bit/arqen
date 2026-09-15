# Security model

ARQEN treats analyzed repositories as untrusted input.

## Current guarantees

- project analysis is read-only
- scanner ignores common dependency/build directories
- transformation paths are resolved under the requested project root
- transformations verify the exact source snapshot before writing
- applied files receive a local `.arqen-backup` before mutation
- dry-run is the default transformation mode
- provider credentials are environment-only and excluded from frontend code
- CORS origins are explicitly configured for the orchestrator
- the orchestrator does not execute repository source or package scripts

## Current limitations

The local CLI is intended to run with the same OS permissions as its user. It is not yet a sandbox. Do not point an untrusted multi-tenant service at arbitrary repositories.

Before hosted execution, ARQEN needs:

1. isolated workspaces
2. filesystem capability restrictions
3. command allowlists and timeouts
4. dependency/network isolation
5. secret redaction
6. model-output validation and prompt-injection defenses
7. audit logs
8. resource quotas
9. explicit approval for high-risk transformations

A model response must never be treated as authorization to execute a shell command, access a secret, or write outside the approved workspace.
