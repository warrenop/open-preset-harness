import { describe, expect, it } from 'vitest'
import { suggestMemoryCandidates } from '../src/suggest-memory-candidates.ts'

describe('suggest_memory_candidates', () => {
  it('extracts compaction summary as high-priority candidate', () => {
    const events = [
      { type: 'compaction/start', seq: 1, data: {} },
      {
        type: 'compaction/summary',
        seq: 2,
        data: { summary: 'Security team decided admin routes require step-up MFA since the audit.' },
      },
      { type: 'compaction/end', seq: 3, data: { turn: 4 } },
    ]

    const out = suggestMemoryCandidates(events, ['security'], {}, 8192)
    expect(out.candidates).toHaveLength(1)
    expect(out.candidates[0]?.kind).toBe('fact')
    expect(out.candidates[0]?.source.type).toBe('compaction/summary')
    expect(out.candidates[0]?.summary_hint).toContain('MFA')
    expect(out.candidates[0]?.suggested_domain).toBe('security')
  })

  it('extracts decision-like assistant lines within since_turn window', () => {
    const events = [
      {
        type: 'assistant/message',
        seq: 10,
        data: {
          turn: 3,
          message: {
            content: [{
              type: 'text',
              text: 'We decided to use opaque cursors for all public pagination endpoints.',
            }],
          },
        },
      },
      {
        type: 'assistant/message',
        seq: 11,
        data: {
          turn: 8,
          message: {
            content: [{
              type: 'text',
              text: '- Convention: never expose offset pagination on public API routes.',
            }],
          },
        },
      },
    ]

    const out = suggestMemoryCandidates(events, ['api'], { since_turn: 5 }, 8192)
    expect(out.candidates).toHaveLength(1)
    expect(out.candidates[0]?.kind).toBe('fact')
    expect(out.candidates[0]?.source.turn).toBe(8)
    expect(out.candidates[0]?.suggested_domain).toBe('api')
  })

  it('dedupes similar hints and respects max_candidates', () => {
    const events = [
      {
        type: 'assistant/message',
        seq: 1,
        data: {
          turn: 2,
          message: { content: [{ type: 'text', text: 'Convention: always validate JWT on admin routes.' }] },
        },
      },
      {
        type: 'assistant/message',
        seq: 2,
        data: {
          turn: 3,
          message: { content: [{ type: 'text', text: 'Convention: always validate JWT on admin routes.' }] },
        },
      },
    ]

    const out = suggestMemoryCandidates(events, [], { max_candidates: 1 }, 8192)
    expect(out.candidates).toHaveLength(1)
    expect(out.omitted_count).toBe(0)
  })
})
