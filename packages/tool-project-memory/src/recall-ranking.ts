/** Recall ranking helpers — Phase 2a token + IDF (no embeddings). */

/** Split text into lowercase recall terms (ASCII/CJK aware). */
export function tokenizeForRecall(text: string): readonly string[] {
  const raw = text.toLowerCase().split(/[^a-z0-9\u4e00-\u9fff]+/).filter(Boolean)
  const terms: string[] = []
  for (const part of raw) {
    if (/[\u4e00-\u9fff]/.test(part)) {
      for (const ch of part) {
        if (/[\u4e00-\u9fff]/.test(ch)) terms.push(ch)
      }
    }
    else if (part.length >= 2) terms.push(part)
  }
  return terms
}

/** Build inverse document frequency map over candidate entry texts. */
export function buildIdfMap(documents: readonly (readonly string[])[]): Map<string, number> {
  const n = documents.length
  const df = new Map<string, number>()
  for (const doc of documents) {
    const seen = new Set(doc)
    for (const term of seen) df.set(term, (df.get(term) ?? 0) + 1)
  }
  const idf = new Map<string, number>()
  for (const [term, count] of df) {
    idf.set(term, Math.log((n + 1) / (count + 1)) + 1)
  }
  return idf
}

/**
 * Token + IDF score for one entry (Phase 2a).
 * @param queryTerms - tokenized query.
 * @param queryRaw - original lowercased query for phrase bonus.
 * @param idf - corpus idf map.
 * @param summary - entry summary.
 * @param tags - entry tags.
 * @param body - entry body.
 */
export function scoreEntryRanked(
  queryTerms: readonly string[],
  queryRaw: string,
  idf: ReadonlyMap<string, number>,
  summary: string,
  tags: readonly string[],
  body: string,
): number {
  if (queryTerms.length === 0) return 0

  const summarySet = new Set(tokenizeForRecall(summary))
  const tagSet = new Set(tags.flatMap(t => tokenizeForRecall(t)))
  const bodyTerms = tokenizeForRecall(body)
  const bodyFreq = new Map<string, number>()
  for (const term of bodyTerms) bodyFreq.set(term, (bodyFreq.get(term) ?? 0) + 1)

  let score = 0
  for (const term of queryTerms) {
    const w = idf.get(term) ?? 1
    if (summarySet.has(term)) score += 3 * w
    if (tagSet.has(term)) score += 2 * w
    const bf = bodyFreq.get(term)
    if (bf !== undefined) score += w * Math.min(bf, 3)
  }

  const summaryLower = summary.toLowerCase()
  if (queryRaw.length >= 3 && summaryLower.includes(queryRaw)) score += 2

  return score
}

/**
 * Phase 0 substring score (legacy ranking).
 * @param query - recall query string.
 * @param summary - entry summary.
 * @param tags - entry tags.
 * @param body - entry body.
 */
export function scoreEntryLegacy(
  query: string,
  summary: string,
  tags: readonly string[],
  body: string,
): number {
  const q = query.toLowerCase()
  let score = 0
  const s = summary.toLowerCase()
  const b = body.toLowerCase()
  if (s.includes(q)) score += 3
  if (tags.some(t => t.toLowerCase().includes(q))) score += 2
  if (b.includes(q)) score += 1
  return score
}
