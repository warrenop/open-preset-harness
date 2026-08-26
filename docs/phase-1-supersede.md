# Phase 1: Supersede governance

**Status:** Implemented (v0.2.0) · **Tracking:** [#4](https://github.com/warrenop/open-preset-harness/issues/4) · **Builds on:** [phase-0-memory-api.md](phase-0-memory-api.md) (`oph-memory-schema: 1`)  
English | [中文](#中文)

Phase 1 closes the **supersede lifecycle**: when `remember` replaces an entry, the old block is marked on disk, recall/index stay consistent, and duplicate supersede attempts fail loudly.

**Out of scope (Phase 1):** similar-summary conflict hints, domain ACL, semantic search, distill hook, new tools.

---

## 1. Problem (Phase 0 gap)

Phase 0 stores a forward link only:

```yaml
# new entry
supersedes: mem-20260817-b1c2d3
```

The old entry file is **unchanged**. `recall` hides superseded entries by building a reverse map at read time. Humans reviewing `domains/*.md` cannot see replacement status without running `recall`.

Phase 1 adds **backward markers on the old entry** and **write-time enforcement**.

---

## 2. Design decisions (locked)

| Topic | Decision |
|-------|----------|
| Old entry marking | **Rewrite frontmatter in place** (same block in `domains/<domain>.md` or `decisions/*.md`) |
| Sidecar metadata files | **No** — git diff on memory files remains the review layer |
| One target, one replacement | **Hard reject** second `supersedes` of the same id → `SUPERSEDES_ALREADY_REPLACED` |
| Chain supersede | **Disallowed** by default — cannot `supersedes` an entry that already has `superseded_by` |
| Self-supersedes | **Reject** → `VALIDATION_FAILED` |
| Cross-domain `supersedes` | **Allow** with **warn** in `remember-result` (`cross_domain_supersedes: true`) |
| `kind: decision` | When superseded, set `decision.status: deprecated` on the old entry |
| Schema version | **Stay `oph-memory-schema: 1`** — new fields are optional |
| New tools | **None** — extend `remember`, index generator, optionally `memory_status` |

---

## 3. Frontmatter (new optional fields)

On the **superseded (old)** entry after a successful `remember`:

```yaml
superseded_by: mem-20260826-a1b2c3   # id of the replacing entry
superseded_at: "2026-08-26T01:00:00.000Z"  # ISO 8601 UTC, same instant as new entry created_at
status: superseded                     # fact + decision entries
```

When the old entry is `kind: decision`, also update:

```yaml
decision:
  status: deprecated
  # stakeholders, alternatives_considered preserved
```

The **new** entry keeps Phase 0 shape:

```yaml
supersedes: mem-20260817-b1c2d3
```

**Invariants after write:**

- If `A.supersedes = B`, then `B.superseded_by = A` and `B.status = superseded`.
- At most one entry may list `supersedes: B` among all loaded entries.
- `B` must not already have `superseded_by` before the write.

---

## 4. `remember` behavior (delta)

Existing steps 1–5 unchanged (validate, append/write new block). Replace step 6:

**6. If `supersedes` set:**

1. Load target entry `T` by id (must exist → else `SUPERSEDES_NOT_FOUND`).
2. If `T.id === new.id` → `VALIDATION_FAILED`.
3. If `T` already has `superseded_by` → `SUPERSEDES_TARGET_ALREADY_SUPERSEDED`.
4. If any other entry already has `supersedes: T.id` → `SUPERSEDES_ALREADY_REPLACED`.
5. Append/write **new** entry block (step 4–5 as today).
6. **Rewrite** target block in place:
   - Set `superseded_by`, `superseded_at`, `status: superseded`.
   - If `T.kind === decision`, set `decision.status: deprecated`.
7. Regenerate `index.md`.
8. Return `remember-result` with optional warnings (see §6).

**Block rewrite:** locate block by stable `id` in frontmatter within `domains/` or `decisions/`; parse → patch frontmatter → serialize block with preserved body. Separator: `<!-- oph-memory-entry -->` (Phase 0 format).

---

## 5. `recall` and index (delta)

### 5.1 `recall`

- Default: exclude entries where `status: superseded` **or** `superseded_by` is set (either signal is sufficient).
- Keep `include_superseded: true` to return them; include `superseded_by` / `superseded_at` from frontmatter when present.
- `buildSupersededMap` remains as a fallback for legacy entries not yet back-patched (Phase 0-only repos).

### 5.2 `index.md`

- **Latest summary** per domain row: most recent **active** entry only (skip `status: superseded`).
- **Entry counts** in index header: optional split `active_entry_count` / `superseded_entry_count` (Phase 1.1 — may ship in same release if cheap).

---

## 6. `remember-result` (delta)

```ts
interface RememberOutput {
  // ... Phase 0 fields ...
  warnings?: string[]           // e.g. cross-domain supersede
  cross_domain_supersedes?: boolean
  superseded_entry?: {
    id: string
    path: string
    domain: string
  }
}
```

---

## 7. Error codes (new)

| Code | When |
|------|------|
| `SUPERSEDES_ALREADY_REPLACED` | Another entry already lists `supersedes: <target>` |
| `SUPERSEDES_TARGET_ALREADY_SUPERSEDED` | Target already has `superseded_by` |
| `SUPERSEDES_PATCH_FAILED` | New entry written but in-place patch of old block failed (see §8) |

Existing: `SUPERSEDES_NOT_FOUND`, `VALIDATION_FAILED`, `MEMORY_WRITE_FAILED`.

---

## 8. Failure modes

**Atomicity goal:** either both new append and old patch succeed, or neither is visible to readers.

Phase 1 implementation strategy:

1. Write new entry to a temp path or memory buffer.
2. Patch old block in file.
3. If (2) fails, remove new block (best-effort rollback) and throw `SUPERSEDES_PATCH_FAILED`.
4. Regenerate index only after (1)+(2) succeed.

If rollback fails, log/return error with both paths — operator fixes via git (acceptable for v0.2).

---

## 9. `memory_status` (optional Phase 1)

```ts
domains: Array<{
  id: string
  entry_count: number        // total blocks
  active_entry_count: number // excludes superseded
  last_updated: string | null
}>
```

---

## 10. Migration / compatibility

- **Read path:** treat entries with only forward `supersedes` links (Phase 0 repos) as today via `buildSupersededMap`.
- **Write path:** first `remember(supersedes: …)` after upgrade back-patches the old block.
- No bulk migration command in Phase 1 (optional `oph memory reconcile` in Phase 2).

---

## 11. Implementation checklist

- [x] `patchEntryById` / `patchEntryAtPath` in memory-store
- [x] `remember`: supersede validation + old-block patch
- [x] Tests: happy path, duplicate supersede, target already superseded, decision deprecated, cross-domain warn
- [x] `recall`: respect `status: superseded` + legacy map
- [x] `index-generator`: latest active summary per domain
- [x] `memory_status` active counts
- [x] Spec cross-links in [phase-0-memory-api.md](phase-0-memory-api.md) §remember step 6

---

## 12. Non-goals (explicit)

- Auto-detect duplicate facts without `supersedes`
- Merge/combine entry bodies
- Supersede across projects
- Approval before supersede (Phase 3)

---

## 中文

### 概要

Phase 1 让 **supersedes 可 review、可 enforcement**：

- 新 entry 仍写 `supersedes: <旧 id>`
- **旧 entry 回写** `superseded_by`、`superseded_at`、`status: superseded`
- decision 被取代时旧文件 **`decision.status: deprecated`**
- 同一旧 id **只能被取代一次**；不能取代已取代的 entry
- 跨 domain 允许但 **warn**
- 不新增工具；schema 仍为 v1，只加 optional 字段

### 新错误码

| 码 | 含义 |
|----|------|
| `SUPERSEDES_ALREADY_REPLACED` | 已有别的 entry 在 supersedes 这个目标 |
| `SUPERSEDES_TARGET_ALREADY_SUPERSEDED` | 目标本身已被取代 |
| `SUPERSEDES_PATCH_FAILED` | 新 entry 写了但旧 block  patch 失败 |

### 实现顺序

1. 按 id 定位 block 并 patch frontmatter  
2. `remember` 集成校验 + 回写  
3. recall / index 只展示 active  
4. （可选）`memory_status` 的 `active_entry_count`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-26 | Implemented in `dsh-tool-project-memory` (remember back-patch, recall/index, memory_status) |
| 2026-08-26 | Initial Phase 1 supersede draft (design locked in discussion) |
