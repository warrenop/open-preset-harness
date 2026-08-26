# Phase 2: Recall ranking scale-up

**Status:** Implemented (Tier 2a, v0.5.0) · **Tracking:** [#7](https://github.com/warrenop/open-preset-harness/issues/7) · **Builds on:** [phase-0-memory-api.md](phase-0-memory-api.md)  
English | [中文](#中文)

Improve `recall` ranking for larger memory pools — **still file-based, no network, no vector DB**. True embedding/vector search is Phase 2b (deferred until Harness exposes a stable embedding path).

---

## 1. Problem

Phase 0 `recall` scoring is substring match on the full query string (`summary.includes(q)`). Multi-word queries miss relevant entries; common terms rank poorly.

---

## 2. Tiers

| Tier | Name | Behavior | Ship target |
|------|------|----------|-------------|
| **2a** | Token + IDF ranking | Split query into terms; score with corpus IDF weights | **v0.5.0** |
| **2b** | Vector sidecar | Optional embeddings on disk + cosine similarity | Deferred |

**Phase 2 closure (minimal):** Tier **2a** only.

---

## 3. Locked decisions (Tier 2a)

| Topic | Decision |
|-------|----------|
| Default | **`token`** ranking when `query` is non-empty |
| Legacy | Config + tool param `ranking: 'legacy'` restores Phase 0 substring scoring |
| Network | None — pure in-process over loaded entries |
| Schema | No change to `oph-memory-schema: 1` or entry files |
| API | Optional `recall` param `ranking?: 'token' \| 'legacy'` |

---

## 4. Config

```ts
/** Recall ranking when query is set. Default: 'token' */
recallRanking?: 'token' | 'legacy'
```

---

## 5. Scoring (token mode)

1. Tokenize query, summary, tags, body (lower case; terms length ≥ 2; CJK single chars allowed)
2. Build document frequency over active candidate entries
3. Per term `t`: `idf(t) = log((N + 1) / (df(t) + 1)) + 1`
4. Score: summary hit `+3*idf`, tag hit `+2*idf`, body hit `+1*idf` (body term freq capped)
5. Full-query substring in summary: `+2` bonus (phrase recall)

---

## 6. Success criteria

| Check | Pass |
|-------|------|
| Default | Multi-term queries rank better than legacy on fixture corpus |
| Legacy | `ranking: 'legacy'` matches Phase 0 behavior |
| Budget | Still respects `recallMaxBytes` truncation |

---

## 中文

Phase 2a：**token + IDF** 提升 `recall` 排序，不引入 embedding 服务。Legacy 模式保持 Phase 0 子串评分。

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-26 | Initial Phase 2 recall ranking draft (Tier 2a for v0.5.0) |
