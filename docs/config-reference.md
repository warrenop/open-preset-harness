# Configuration reference

English | [中文](config-reference.zh.md)

Complete `dsh-tool-project-memory` plugin config. All features default **off** unless noted.

---

## Core

| Key | Default | Description |
|-----|---------|-------------|
| `projectRoot` | auto (`.git`) | Override project root detection |
| `memoryDir` | `.dsh/memory` | Memory directory under project root |
| `indexInjectMaxBytes` | `4096` | Blank-session index inject budget |
| `recallMaxBytes` | `32768` | `recall` output budget |
| `rememberMaxBodyBytes` | `16384` | `remember` body max |
| `maxDomains` | `64` | Soft domain count hint |

---

## Write governance (Phase 3)

| Key | Default | Description |
|-----|---------|-------------|
| `readOnly` | `false` | Block all writes |
| `writeDenyDomains` | `[]` | Deny list (wins over allow) |
| `writeAllowDomains` | `[]` | Non-empty → whitelist domains |
| `writeDenyPresets` | `[]` | Presets blocked from `remember` |
| `writeAllowPresets` | `[]` | Non-empty → whitelist presets |
| `writeApprovalDomains` | `[]` | Harness approval before `remember` |

---

## Distill (Phase 1)

| Key | Default | Tier | Description |
|-----|---------|------|-------------|
| `distillReminder` | `false` | 1a | Turn-end `remember` reminder inject |
| `distillReminderMaxBytes` | `2048` | 1a/1b | Reminder / auto-distill inject budget |
| `distillReminderMinTurn` | `2` | 1a | Min turns before turn-end reminder |
| `distillCompactionReminder` | `false` | 1b | Post-compaction reminder inject |
| `distillAssist` | `false` | 2 | Register `suggest_memory_candidates` |
| `distillAssistMaxBytes` | `8192` | 2/3 | Candidate scan output budget |
| `distillAuto` | `false` | 3 | Auto-write eligible candidates |
| `distillAutoTrigger` | `compaction-end` | 3 | `compaction-end` or `turn-stopping` |
| `distillAutoMaxWrites` | `3` | 3 | Per-session auto-write cap (1–10) |
| `distillAutoFactsOnly` | `true` | 3 | Skip decision candidates |
| `distillAutoRequireDomain` | `true` | 3 | Require `suggested_domain` |
| `distillAutoSkipApprovalDomains` | `true` | 3 | Skip auto-write on approval domains |
| `distillAutoFallbackDomain` | `general` | 3 | When `requireDomain: false` |
| `distillAutoLlm` | `false` | 3+ | LLM filter before auto-write |

---

## Recall (Phase 2)

| Key | Default | Description |
|-----|---------|-------------|
| `recallRanking` | `token` | Default ranking: `token`, `legacy`, `vector` |
| `vectorSidecar` | `false` | Maintain vector index on `remember` |
| `vectorDimensions` | `256` | Sidecar width (32–4096) |
| `vectorEmbedModel` | `local-fhash-v1` | `local-fhash-v1` or `llm-keywords-v1` |

---

## Memory LLM assist (v1.0)

Requires `@deepseek-ai/dsh-llm` composed in Harness. Fail-open when unavailable.

| Key | Required when | Description |
|-----|---------------|-------------|
| `memoryLlmProvider` | LLM features on | Provider route |
| `memoryLlmModel` | LLM features on | Model id |
| `memoryLlmMaxTokens` | — | Default `512` |
| `memoryLlmTimeoutMs` | — | Default `15000` |

Enable LLM features with either `distillAutoLlm: true` or `vectorEmbedModel: llm-keywords-v1`.

---

## Example profiles

**Security team — ACL + approval:**

```yaml
config:
  writeAllowPresets: ['security-review', 'sre-incident']
  writeApprovalDomains: ['security', 'client']
  writeDenyDomains: []
```

**SRE — auto-distill after compaction with LLM filter:**

```yaml
config:
  distillAuto: true
  distillAutoLlm: true
  distillAutoTrigger: compaction-end
  memoryLlmProvider: deepseek
  memoryLlmModel: deepseek-chat
  writeAllowPresets: ['sre-incident']
  writeApprovalDomains: ['client']
```

**Large corpus — vector recall:**

```yaml
config:
  vectorSidecar: true
  vectorEmbedModel: llm-keywords-v1
  recallRanking: vector
  memoryLlmProvider: deepseek
  memoryLlmModel: deepseek-chat
```

---

## See also

- [phase-0-memory-api.md](phase-0-memory-api.md)
- [phase-1-distill.md](phase-1-distill.md)
- [phase-2-recall.md](phase-2-recall.md)
- [phase-3-governance.md](phase-3-governance.md)
- [harness-integration.md](harness-integration.md)
