# SRE postmortem → debug preset playbook

**Scenario:** [#1](https://github.com/warrenop/open-preset-harness/issues/1) · **Domains:** `sre`, `incidents`

Walkthrough for production ops: postmortem preset writes institutional memory; debug preset recalls during the next outage.

---

## 1. Setup

```bash
dsh plugin --profile web add "github:warrenop/open-preset-harness#v1.0.0&path:packages/tool-project-memory"
```

Profile patch (excerpt):

```yaml
- insert:
    - id: dsh-tool-project-memory
      name: dsh-tool-project-memory
      config:
        writeAllowPresets: ['sre-incident', 'postmortem']
        writeApprovalDomains: ['client']
        distillCompactionReminder: true
        distillAuto: true
        distillAutoTrigger: compaction-end
        recallRanking: token
        vectorSidecar: true
```

---

## 2. Writer — postmortem session

After incident resolution, postmortem preset distills durable facts:

```
remember(
  kind=fact,
  domain=incidents,
  summary=2026-08 Redis failover caused 12m API outage — root cause split-brain during AZ fail-over,
  body=## Timeline
- 14:02 UTC: AZ-a network partition
- 14:08: Redis sentinel promoted replica with stale data
...

Tags: redis, failover, sev2
confidence=high
)
```

Optional supersede when runbook changes:

```
remember(
  kind=fact,
  domain=sre,
  summary=Runbook: verify sentinel quorum before manual failover,
  body=...,
  supersedes=mem_previous_id
)
```

---

## 3. Reader — debug session

During a similar outage, debug preset recalls before escalating:

```
recall(query=redis failover sentinel, domain=incidents, limit=5)
recall(query=runbook manual failover, domain=sre)
```

Index inject on blank session already lists domains and recent decisions.

---

## 4. Governance

| Control | Effect |
|---------|--------|
| `writeAllowPresets` | Only SRE/postmortem presets write |
| `writeApprovalDomains: [client]` | Client PII facts need human approval |
| `distillAuto` + compaction | Long incident sessions auto-distill after compaction |
| Git diff on `.dsh/memory/` | Human review layer for all writes |

---

## 5. Success criteria

- Postmortem facts visible to debug preset in a **new** session
- Repeat root causes surfaced via `recall` query, not re-debugged from scratch
- Client-domain writes blocked or approval-gated

---

## See also

- [scenarios.md](../scenarios.md) — SRE row
- [config-reference.md](../config-reference.md)
- [phase-3-governance.md](../phase-3-governance.md)
