import { describe, expect, it } from 'vitest'
import {
  recallPresentationMeta,
  recallPresentResult,
  rememberPresentationMeta,
  rememberPresentResult,
} from '../src/presentation.ts'

describe('tool presentation', () => {
  it('builds recall presentation meta and result title', () => {
    const value = {
      kind: 'recall-result' as const,
      query: 'mfa',
      domain: 'security',
      entries: [{
        id: 'mem-20260818-a3f2c1',
        kind: 'fact' as const,
        domain: 'security',
        summary: 'Admin MFA required',
        path: 'domains/security.md',
        created_at: '2026-08-18T06:00:00.000Z',
        confidence: 'high' as const,
        tags: [],
        sensitivity: 'internal' as const,
        excerpt: 'details',
      }],
      omitted_count: 0,
      truncated: false,
      project_root: '/proj',
      memory_dir: '/proj/.dsh/memory',
    }

    const meta = recallPresentationMeta({}, value)
    expect(meta.entries).toEqual([{ id: 'mem-20260818-a3f2c1', domain: 'security' }])

    const view = recallPresentResult({}, { meta })
    expect(view).toEqual({
      card: 'generic',
      title: 'mem-20260818-a3f2c1 · security',
    })
  })

  it('builds remember presentation meta and result title', () => {
    const value = {
      kind: 'remember-result' as const,
      id: 'mem-20260818-b1c2d3',
      path: 'domains/api.md',
      domain: 'api',
      entry_kind: 'fact' as const,
      created_at: '2026-08-18T06:00:00.000Z',
      index_updated: true,
    }

    const meta = rememberPresentationMeta({}, value)
    expect(meta.id).toBe('mem-20260818-b1c2d3')
    expect(meta.domain).toBe('api')

    const view = rememberPresentResult({}, { meta })
    expect(view).toEqual({
      card: 'generic',
      title: 'mem-20260818-b1c2d3 · api',
    })
  })
})
