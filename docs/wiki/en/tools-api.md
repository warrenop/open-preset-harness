# Tools API

[Wiki home](../README.md) · Spec: [phase-0-memory-api.md](../../phase-0-memory-api.md)

| Tool | Purpose |
|------|---------|
| `recall` | Search project memory by query/domain |
| `remember` | Persist distilled fact or decision |
| `memory_status` | Domains, counts, initialization |

**Permissions:** read/write only `<projectRoot>/.dsh/memory/`; no network.

Config defaults: `indexInjectMaxBytes: 4096`, `recallMaxBytes: 32768`, `rememberMaxBodyBytes: 16384`.
