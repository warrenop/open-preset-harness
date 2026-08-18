## Cross-functional: SRE postmortem → debug preset

- **Industry / context:** Production operations / SaaS
- **Writer preset (example):** postmortem — documents root cause and mitigations after an incident
- **Reader preset (example):** debug — recalls similar patterns during a new outage
- **Memory domain(s):** `sre`, `incidents`
- **Without shared memory:** Each incident is debugged from scratch; repeat root causes burn tokens and on-call time
- **With shared memory:** Postmortem facts live in `.dsh/memory/`; any preset recalls runbook deltas before escalating

---

*Seed issue for open-preset-harness — please add your own scenarios via the Scenario template.*
