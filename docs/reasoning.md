# ARQEN structured reasoning

ARQEN separates deterministic evidence collection from model reasoning.

## Flow

```text
repository
  ↓
static analyzer
  ↓
framework-neutral graph / UIIR
  ↓
deterministic findings
  ↓
/v1/recommend
  ↓
structured recommendations
  ↓
bounded transformation
```

`POST /v1/recommend` accepts a bounded list of deterministic findings and project metadata. Repository-derived strings are explicitly treated as untrusted data in the reasoning prompt. The model is asked to rank and explain findings, not execute repository operations or emit implementation code.

The response contains:

- `findingId`
- `priority`
- `rationale`
- `proposedChange`
- `affectedFiles`
- `safeToAutomate`

`safeToAutomate` is advisory. It does not authorize mutation. Transformation approval remains a separate boundary.

## Security boundary

Do not send secrets, credentials, arbitrary source dumps, or executable instructions as model context. Future repository-context APIs should enforce allowlisted fields and explicit size limits before model invocation.

Provider-specific structured-output behavior must remain behind the provider interface. The core reasoning contract is provider-neutral.
