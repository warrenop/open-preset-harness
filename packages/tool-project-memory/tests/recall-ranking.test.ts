import { describe, expect, it } from 'vitest'
import {
  buildIdfMap,
  scoreEntryLegacy,
  scoreEntryRanked,
  tokenizeForRecall,
} from '../src/recall-ranking.ts'

describe('recall ranking', () => {
  it('tokenizes ASCII and CJK terms', () => {
    expect(tokenizeForRecall('Admin MFA pagination')).toEqual(['admin', 'mfa', 'pagination'])
    expect(tokenizeForRecall('分页接口')).toContain('分')
  })

  it('ranks multi-term queries better than legacy substring miss', () => {
    const query = 'opaque cursor pagination'
    const summary = 'Public API pagination uses opaque cursors not offsets'
    const tags = ['api']
    const body = 'Never expose offset pagination on public routes.'

    const legacy = scoreEntryLegacy(query, summary, tags, body)
    expect(legacy).toBe(0)

    const terms = tokenizeForRecall(query)
    const idf = buildIdfMap([
      tokenizeForRecall(summary),
      tokenizeForRecall('Unrelated client Slack preference'),
    ])
    const ranked = scoreEntryRanked(terms, query.toLowerCase(), idf, summary, tags, body)
    expect(ranked).toBeGreaterThan(0)
  })

  it('legacy mode matches Phase 0 substring scoring', () => {
    const q = 'pagination'
    const summary = 'Pagination uses opaque cursors'
    expect(scoreEntryLegacy(q, summary, [], '')).toBe(3)
  })
})
