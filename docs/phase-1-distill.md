# Phase 1: Session distill hook

**Status:** Implemented (Tier 1a, v0.3.0) · **Tracking:** [#5](https://github.com/warrenop/open-preset-harness/issues/5) · **Builds on:** [phase-0-memory-api.md](phase-0-memory-api.md), [phase-1-supersede.md](phase-1-supersede.md)  
English | [中文](#中文)

Optional hooks that nudge or assist **session → project memory** distillation after a turn or compaction — without replacing explicit `remember` or bypassing **model-visible ⟺ logged**.

**Out of scope (this doc):** vector search (Phase 2), domain ACL (Phase 3), auto-write secrets, replacing compaction/session-reference.

---

## 1. Problem

Today memory only grows when the agent **calls `remember`**. Long sessions and compaction shrink the episode but durable learnings are lost unless the model remembers to distill.

Phase 0 non-goal explicitly moved this to Phase 1:

> Automatic distill from session log (Phase 1)

---

## 2. Design tiers (recommended rollout)

| Tier | Name | Behavior | LLM in plugin | Ship target |
|------|------|----------|---------------|-------------|
| **1a** | Turn-end reminder | After eligible turn, inject bounded reminder to call `remember` for durable facts | No | **v0.3.0** |
| **1b** | Compaction reminder | After `compaction/end`, inject reminder referencing compaction summary | No | v0.3.x |
| **2** | Assisted distill | Plugin prepares candidate excerpts; model still calls `remember` | Optional read-only | Phase 1.5+ |
| **3** | Auto distill | Plugin calls LLM + `rememberEntry` programmatically | Yes | Deferred — needs governance |

**Phase 1 closure (minimal):** Tier **1a** (+ config + tests). Tier 1b if compaction event is accessible without forking Harness.

---

## 3. Locked decisions (Tier 1a)

| Topic | Decision |
|-------|----------|
| Default | **Off** — `distillReminder: false` |
| Hook | `agent/turn-stopping` (serial; turn about to close) |
| Write path | **Never** auto-call `rememberEntry` in Tier 1a |
| Visibility | Reminder via `agent.inject()` — same as index baseline (logged) |
| Frequency | At most **once per session** per reminder kind (dedupe digest) |
| Eligibility | Turn completed (`reason: completed` path only — no inject on error/aborted) |
| Content | Bounded system-reminder; lists domains from `memory_status` hint |
| Domains | Suggest calling `remember`; do not pick domain automatically |

---

## 4. Config (plugin)

```ts
export interface ProjectMemoryConfig {
  // ... Phase 0/1 fields ...

  /** Tier 1a: inject turn-end remember reminder. Default: false */
  distillReminder?: boolean
  /** Max UTF-8 bytes for distill reminder inject. Default: 2048 */
  distillReminderMaxBytes?: number
  /** Minimum user turns before first reminder (avoid turn 1 noise). Default: 2 */
  distillReminderMinTurn?: number
}
```

`cordis.patch.yml` example:

```yaml
config:
  distillReminder: true
  distillReminderMinTurn: 3
```

---

## 5. Tier 1a behavior

**Hook:** `agent/turn-stopping`

1. If `!distillReminder` or `readOnly` → no-op
2. If session turn count `< distillReminderMinTurn` → no-op
3. If reminder already injected this session (WeakMap + digest) → no-op
4. If turn did not complete normally (inspect agent/session — skip error/aborted/blocked) → no-op
5. Build bounded reminder text:

```markdown
<system-reminder>
If this session produced durable project learnings (conventions, decisions, client prefs, incident facts),
call `remember` with one fact per domain — not raw chat logs.
Use `memory_status` to see domains; use `recall` before overwriting related facts.
</system-reminder>
```

6. `agent.inject({ content, source: { kind: 'project-memory', version: 1, action: 'distill-reminder', ... } })`

**Non-goals Tier 1a:** parse session log, extract candidates, auto-domain, auto-supersedes.

---

## 6. Tier 1b (draft — compaction)

**Hook:** subscribe to session log `compaction/end` or Cordis equivalent when exposed to plugins.

Inject parallel reminder referencing that context was compacted — prioritize distilling facts that would be lost. Requires Harness event wiring research before implementation.

---

## 7. Tier 2–3 (deferred)

**Assisted distill:** tool or internal helper `suggest_memory_candidates(session_slice)` returning structured suggestions the model may accept/reject — still ends in explicit `remember`.

**Auto distill:** programmatic LLM + `rememberEntry` — needs confidence thresholds, domain policy, cost controls, and likely Phase 3 governance. Not Phase 1 minimal closure.

---

## 8. Relationship to Harness features

| Feature | Division |
|---------|----------|
| `remember` tool | Still the only write path in Tier 1 |
| Compaction | Shrinks session; distill reminder prompts saving durable slice |
| Session reference | Episodic cross-session read; not a substitute for distilled memory |
| Index inject | Blank session baseline; distill reminder is mid-session |

---

## 9. Implementation checklist (Tier 1a)

- [x] Config fields + defaults in `types.ts` / `cordis.patch.yml`
- [x] `installDistillReminder(ctx, config)` in plugin
- [x] Turn-stopping handler + session dedupe
- [x] Turn completion eligibility check
- [x] Typed `source` marker `action: 'distill-reminder'`
- [x] Unit tests (mock agent context where feasible)
- [ ] Docs: harness-integration, README roadmap

---

## 10. Success criteria

| Check | Pass |
|-------|------|
| Default off | No inject when `distillReminder` unset |
| Opt-in | Inject once per session when enabled + eligible turn |
| Logged | Inject appears in session log with `project-memory` source |
| No auto-write | `.dsh/memory/` unchanged unless agent calls `remember` |

---

## 中文

### 概要

Phase 1 第二项：**session → memory 蒸馏 hook**（可选、默认关闭）。

**先做 Tier 1a（v0.3.0）：** 在 eligible turn 结束时 `agent.inject` 提醒调用 `remember`，**不自动写盘**、不在插件里调 LLM。

**后续：** compaction 提醒（1b）、候选摘要（2）、自动蒸馏（3，暂缓）。

### 配置

- `distillReminder: false`（默认）
- `distillReminderMinTurn: 2`
- `distillReminderMaxBytes: 2048`

---

## Changelog

| Date | Change |
|------|------|
| 2026-08-26 | Initial Phase 1 distill draft (Tier 1a locked for v0.3.0) |
