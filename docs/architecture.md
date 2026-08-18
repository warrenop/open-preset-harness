# Architecture

English | [中文](#中文)

How **open-preset-harness** relates to DeepSeek Harness and where project memory sits.

---

## Three layers

| Layer | Owner | Lifetime | Contents |
|-------|-------|----------|----------|
| **Preset** | Harness `agent-presets` | Per session (composition frozen after first turn) | Tools, persona, prompt sections |
| **Session log** | Harness `dsh-session` | Per session, durable | Turns, messages, tool calls, compaction |
| **Project memory** | **This project** | Per project repo / workspace | Distilled facts, domains, decisions |

Presets are **roles**. Sessions are **episodes**. Project memory is **organizational knowledge**.

---

## Upstream dependency

```text
@deepseek-ai/cordis
        └── DeepSeek Harness (bundles, agent-loop, session, tools, presets)
                    └── open-preset-harness
                              ├── dsh-tool-project-memory   (Phase 0)
                              └── conventions: .dsh/memory/
```

**Integration strategy**

1. Ship a **Cordis plugin package** that registers tools and session hooks — no fork of agent-loop
2. Resolve project root like `dsh-skill-filesystem` (nearest `.git` ancestor, else cwd)
3. Honor **model-visible ⟺ logged**: baseline index via inject; tool results via normal pipeline
4. Contribute generic fixes upstream when they benefit both projects

---

## On-disk layout

```text
<projectRoot>/
└── .dsh/
    └── memory/
        ├── index.md                 # Auto-injected on blank session (bounded)
        ├── domains/
        │   └── <domain>.md          # Rolling domain logs (append-friendly)
        └── decisions/
            └── YYYY-MM-<slug>.md    # Atomic decision records
```

**Not preset-scoped.** Domains are thematic (`security`, `client`, `api`), not `preset-id`.

---

## Runtime flow (Phase 0)

```text
Blank session start
    → plugin reads index.md (if exists)
    → agent.inject() durable user/message (baseline, once)

Agent calls recall(domain?, query?)
    → read + rank + budget-truncate domain/decision files
    → tool/result with citations (paths, entry ids)

Agent calls remember(...)
    → validate frontmatter + body
    → append to domain file OR create decision file
    → tool/result with entry id + path
```

Optional Phase 1: distill hook after turn/compaction (opt-in, deployment config).

---

## Relationship to existing Harness features

| Feature | Overlap | Division |
|---------|---------|----------|
| `AGENTS.md` / agent-instructions | Project rules | Static/normative; memory holds **learned** facts |
| Skills (`.dsh/skills`) | Reusable procedures | Skills = how-to; memory = what-we-learned |
| Session reference | Cross-session read | Reference = episodic snapshot; memory = distilled |
| Compaction | Long session | Compaction shrinks one session; memory survives across sessions |
| Resume | Same session | Resume continues episode; memory supplements **new** sessions |

---

## Governance (Phase 0 minimal → Phase 3 full)

| Phase | Write model |
|-------|-------------|
| 0 | Any preset with `remember` tool can write; git diff is the review layer |
| 1 | `supersedes` frontmatter + domain helpers |
| 3 | Domain ACL, approval gate for sensitive domains |

---

## Package plan (draft)

| Package | Phase | Role |
|---------|-------|------|
| `dsh-tool-project-memory` | 0 | `remember`, `recall`, `memory_status` tools + blank-session inject |
| `dsh-project-memory-core` | 1 | Schema validation, supersede, index regeneration |
| `oph-cli` | 2 | Human-facing `memory search`, `memory doctor` |

Monorepo layout TBD when implementation starts; spec lives in [phase-0-memory-api.md](phase-0-memory-api.md).

---

## 中文

**三层：** Preset = 角色壳；Session = 单次对话；Project memory = 项目组织记忆。

**策略：** 插件扩展 Harness，不 fork agent-loop；目录约定 `.dsh/memory/`；按 **领域** 组织，不按 Preset id。

**与 AGENTS.md / Skills / session-reference / compaction 的分工** 见上表 — 记忆承载「项目中沉淀的事实」，不是规范全文或单次会话快照。

详细工具参数与 frontmatter 见 [phase-0-memory-api.md](phase-0-memory-api.md)。
