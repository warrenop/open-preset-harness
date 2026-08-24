# open-preset-harness

**Project memory for multi-role AI agents — one knowledge base, every preset reads.**

English | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/DSH-Memory%20plugin-dsh--tool--project--memory-blue)](DSH-PLUGIN.md)

> **DSH Profile Bundle:** [`dsh-tool-project-memory`](packages/tool-project-memory) · Category: **Memory** · [Install](#install-profile-bundle--recommended) · [DSH1024 checklist](packages/tool-project-memory/PUBLISH.md)

> Agents forget between sessions. Teams don't.  
> **open-preset-harness** adds a **project-scoped organizational memory layer** on top of [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness): any role (preset) can contribute experience; any role can recall it when needed.

---

## Why this exists

DeepSeek Harness separates **preset** (who the agent is — tools, persona, prompts) from **session log** (what happened in one conversation). That split is right for engineering — but **team knowledge lives at the project level**, not inside a single preset or session.

Without shared memory:

- A security review preset rediscovers the same auth pitfalls every sprint
- A new contributor preset repeats questions answered three months ago
- Product decisions vanish when the PM's session ends
- Token spend grows because every role rebuilds context from scratch

**open-preset-harness** makes project experience **compound over time** — like a team wiki that agents actually use, wired into the harness session log.

---

## What it is (and is not)

| | |
|---|---|
| **Is** | Open-source **project organizational memory** for Harness presets |
| **Is** | Domain-organized, recall-on-demand, auditable contributions |
| **Is not** | A replacement for DeepSeek Harness (we extend it) |
| **Is not** | Per-preset silos or a generic vector DB demo |
| **Is not** | Claiming to invent "AI memory" — we integrate it correctly for **multi-role teams** |

---

## Relationship to DeepSeek Harness

```text
DeepSeek Harness (upstream, MIT)
        │
        ├── preset  = role shell (tools + persona)
        ├── session = episodic log (one conversation)
        │
        └── open-preset-harness (this project)
                └── project memory = shared team experience (cross-preset, cross-session)
```

- **Upstream:** [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) — plugin-based agent harness on Cordis
- **Our approach:** Prefer **plugins + conventions** over a hard fork; track upstream releases
- **License:** MIT — we preserve upstream copyright in [NOTICE](NOTICE)
- **Naming:** This is an **independent community project**, not an official DeepSeek product

We upstream-friendly fixes when possible; project-memory features live here until (if ever) they graduate upstream.

See [docs/architecture.md](docs/architecture.md) and [docs/phase-0-memory-api.md](docs/phase-0-memory-api.md).

---

## Core concepts

```text
┌─────────────────────────────────────────────────────────┐
│              Project Memory (shared)                       │
│   index · domains · decisions · distilled learnings      │
└────────────────────────▲────────────────────────────────┘
                         │ write (distill) / read (recall)
     ┌───────────────────┼───────────────────┐
     │                   │                   │
  Preset A            Preset B            Preset C
  (any role)          (any role)          (any role)
     │                   │                   │
  Session 1           Session 2           Session N
  (episodic log)      (episodic log)      (episodic log)
```

1. **Preset** — role/capability shell (unchanged Harness semantics)
2. **Session log** — full history of one conversation (unchanged)
3. **Project memory** — **stable, distilled, searchable** facts the whole team reuses

**Design rules**

- **One memory pool per project** — all presets read (governance controls write)
- **Organize by domain/topic**, not by preset id (e.g. `security`, `api`, `onboarding`)
- **Index + recall on demand** — don't dump the whole library every turn
- **Model-visible ⟺ logged** — Harness invariant; memory enters via inject/tools/session events

Default layout:

```text
<projectRoot>/.dsh/memory/
├── index.md
├── domains/
│   ├── engineering.md
│   ├── product.md
│   └── …
└── decisions/
    └── YYYY-MM-slug.md
```

---

## Scenarios

| Scenario | Who writes | Who reads | Value |
|----------|------------|-----------|-------|
| **Cross-functional delivery** | Any function | Any other preset | Decisions don't die in someone else's session |
| **Engineering ↔ QA** | Dev preset after API change | QA preset before test plan | Fewer alignment loops |
| **Product ↔ Engineering** | PM preset after scope call | Eng preset during implementation | "Why we chose B" stays attached |
| **Security / compliance** | Review preset after audit | All presets | Constraints propagate |
| **Onboarding** | Senior presets over time | New hire's preset day one | Context without senior interrupt |
| **Open-source maintainers** | Triage preset | Release preset | Known issues and release norms |
| **Agency / client work** | Account preset | Delivery preset | Client preferences travel with the repo |
| **Research → writing** | Literature preset | Drafting preset | Findings become citable facts |
| **SRE / incidents** | Postmortem preset | Debug preset | Incident learnings reduce repeats |
| **Design systems** | Design preset | Frontend preset | Tokens and exceptions stay aligned |
| **Localization** | Translator preset | Dev preset | Terminology stays consistent |
| **Data / ML pipelines** | EDA preset | Modeling preset | Data quirks persist |

More in [docs/scenarios.md](docs/scenarios.md).

---

## Status

🚧 **Early experiment — testing product–market fit in CN + EN communities.**

| Milestone | Status |
|-----------|--------|
| Memory API draft | ✅ [phase-0-memory-api.md](docs/phase-0-memory-api.md) |
| File-based `.dsh/memory/` convention | ✅ Implemented in plugin core |
| `remember` / `recall` tools plugin | ✅ [dsh-tool-project-memory](packages/tool-project-memory) (DSH Profile Bundle) |
| Demo: two presets, one memory pool | 📝 [walkthrough](docs/demo-walkthrough.md) + [demo-project](examples/demo-project/) |

Star ⭐ if you want updates. **Issues and scenario PRs are the best way to help us validate the idea.**

---

## Roadmap

### Phase 0 — Prove the story (weeks 1–4)

- [x] Memory API draft (tools + frontmatter schema)
- [ ] Harness plugin: inject `index.md` on blank session; `recall` / `remember` tools
- [ ] Demo repo + 3-minute screen recording
- [ ] Bilingual README + scenarios doc

### Phase 1 — Team-ready basics (months 1–3)

- [ ] Domain taxonomy helpers + conflict / supersede rules
- [ ] Turn-end or manual **distill** hook (session → memory, opt-in)
- [ ] Git-friendly diff workflow for memory changes
- [ ] Integration notes with Harness compaction + session-reference

### Phase 2 — Scale retrieval (months 3–6)

- [ ] Semantic search (optional local embed index)
- [ ] Memory budget / ranking / citation in tool results
- [ ] CLI: `oph memory status`, `oph memory search`

### Phase 3 — Enterprise-shaped (demand-driven)

- [ ] Write ACL by domain
- [ ] Audit export, approval before publish
- [ ] Hosted sync (optional SaaS — not required for OSS core)

Priorities shift with **your Issues** — tell us your scenario.

---

## Quick start

> **DSH Memory plugin:** [packages/tool-project-memory](packages/tool-project-memory) · `npm run check` passing

### Install (Profile Bundle — recommended)

```bash
dsh plugin --profile web add github:warrenop/open-preset-harness#main&path:packages/tool-project-memory
dsh --profile web --dump-config | grep dsh-tool-project-memory
```

Headless / CI:

```bash
dsh plugin --profile headless add github:warrenop/open-preset-harness#main&path:packages/tool-project-memory
```

From a local clone:

```bash
dsh plugin --profile web add ./packages/tool-project-memory
```

### Develop locally

1. [Harness integration](docs/harness-integration.md) — link plugin into local Harness
2. [Dual-preset demo](docs/demo-walkthrough.md) — `standard` writes, `code` reads
3. Open a [Scenario Issue](.github/ISSUE_TEMPLATE/scenario.yml) — tag `en-scenario` or `cn-scenario`

```bash
chmod +x scripts/link-harness.sh
./scripts/link-harness.sh /path/to/deepseek-harness-master
```

### DSH1024 marketplace

| Field | Value |
|-------|-------|
| Category | Memory |
| Package | `dsh-tool-project-memory` |
| Install | `dsh plugin --profile web add github:warrenop/open-preset-harness#main&path:packages/tool-project-memory` |
| Listing | [DSH1024](https://deepseek1024.com/) (discovery via GitHub topic `dsh-plugin`) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

**High-impact contributions right now:**

1. Add a scenario to [docs/scenarios.md](docs/scenarios.md)
2. Review [docs/phase-0-memory-api.md](docs/phase-0-memory-api.md)
3. Chinese + English doc fixes

---

## Community

- **Issues** — bugs, ideas, scenario requests
- **Discussions** — enable when repo is public
- Tag Issues with `[cn-scenario]` or `[en-scenario]` to help us track market signals

---

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).  
DeepSeek Harness is © DeepSeek; modifications © contributors.
