# Scenario library

Real workflows help validate open-preset-harness. **PRs welcome.**

Use the template in [CONTRIBUTING.md](../CONTRIBUTING.md). Tag related Issues `[cn-scenario]` or `[en-scenario]`.

---

### Cross-functional: engineering + legal

- **Industry / context:** SaaS B2B
- **Writer preset (example):** legal-review — records data-processing constraints
- **Reader preset (example):** backend — recalls before adding analytics
- **Memory domain(s):** `legal`, `privacy`
- **Without shared memory:** Engineering ships a feature; legal finds a violation late
- **With shared memory:** Constraints recalled at design time

---

### Open source: triage + release

- **Industry / context:** OSS maintainer workflow
- **Writer preset (example):** triage — documents "do not merge without X"
- **Reader preset (example):** release — recalls before tagging
- **Memory domain(s):** `maintainer`, `release`
- **Without shared memory:** Release notes miss known blockers
- **With shared memory:** Release checklist inherits triage norms

---

### Agency: client preferences

- **Industry / context:** Client services / agency
- **Writer preset (example):** account — client comms preferences, landmines
- **Reader preset (example):** delivery — recalls before client-facing work
- **Memory domain(s):** `client`
- **Without shared memory:** Delivery team repeats mistakes account already learned
- **With shared memory:** Preferences travel with the repo

---

### Onboarding: senior → junior

- **Industry / context:** Any software team
- **Writer preset (example):** Any preset over months — architecture, gotchas
- **Reader preset (example):** onboarding — day-one recall from index + domains
- **Memory domain(s):** `onboarding`, `architecture`
- **Without shared memory:** New hire interrupts seniors for context
- **With shared memory:** Structured project briefing from memory

---

### Engineering ↔ QA

- **Industry / context:** Product engineering
- **Writer preset (example):** backend — API contract and edge cases after change
- **Reader preset (example):** qa — recalls before writing test plan
- **Memory domain(s):** `engineering`, `api`
- **Without shared memory:** QA rediscovers API quirks each sprint
- **With shared memory:** Test plans align with documented behavior

---

### Product ↔ Engineering

- **Industry / context:** Feature delivery
- **Writer preset (example):** product — scope decision and rationale
- **Reader preset (example):** engineering — recalls during implementation
- **Memory domain(s):** `product`
- **Without shared memory:** "Why we chose B" lost after PM session ends
- **With shared memory:** Rationale searchable in project memory

---

### Security / compliance gate

- **Industry / context:** Regulated or security-sensitive product
- **Writer preset (example):** security-review — audit findings and required controls
- **Reader preset (example):** Any preset — recalls before risky changes
- **Memory domain(s):** `security`, `compliance`
- **Without shared memory:** Same auth/PII mistakes repeat
- **With shared memory:** Controls propagate to all roles

---

### SRE: incident → debug

- **Industry / context:** Production operations
- **Writer preset (example):** postmortem — root cause, mitigations, runbook deltas
- **Reader preset (example):** debug — recalls during similar incidents
- **Memory domain(s):** `sre`, `incidents`
- **Without shared memory:** Repeat outages with same root cause
- **With shared memory:** Institutional incident memory

---

### Cross-functional: finance / procurement / planning (one of many)

- **Industry / context:** Enterprise project delivery
- **Writer preset (example):** finance, procurement — cost rules, vendor constraints
- **Reader preset (example):** planning, budget — recalls for cost models
- **Memory domain(s):** `finance`, `procurement`, `planning`
- **Without shared memory:** Planning preset lacks cross-function context
- **With shared memory:** One project pool; any role contributes and any role reads

---

### Research → writing

- **Industry / context:** Research or content team
- **Writer preset (example):** literature — distilled findings and citations
- **Reader preset (example):** drafting — recalls facts while writing
- **Memory domain(s):** `research`
- **Without shared memory:** Drafting preset re-queries sources
- **With shared memory:** Citable project facts in memory

---

### Design system ↔ frontend

- **Industry / context:** Design-led product
- **Writer preset (example):** design — tokens, patterns, documented exceptions
- **Reader preset (example):** frontend — recalls before implementing UI
- **Memory domain(s):** `design`
- **Without shared memory:** UI drift from design system
- **With shared memory:** Exceptions and rationale are shared

---

### Localization ↔ development

- **Industry / context:** i18n product
- **Writer preset (example):** localization — terminology, locale rules
- **Reader preset (example):** development — recalls before string/UI changes
- **Memory domain(s):** `i18n`
- **Without shared memory:** Inconsistent terminology across locales
- **With shared memory:** Glossary lives in project memory

---

### Data science: EDA → modeling

- **Industry / context:** ML / analytics
- **Writer preset (example):** eda — data quirks, leakage warnings, feature notes
- **Reader preset (example):** modeling — recalls before training
- **Memory domain(s):** `data`, `modeling`
- **Without shared memory:** Modeling rediscovers data issues
- **With shared memory:** EDA insights persist for the project

---

## Add yours

Copy a block above, edit fields, and open a PR. One scenario is enough.
