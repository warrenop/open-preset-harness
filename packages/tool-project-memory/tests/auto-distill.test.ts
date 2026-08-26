import { mkdtemp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  filterAutoDistillCandidates,
  formatAutoDistillInject,
  resolveAutoDistillDomain,
  runAutoDistill,
} from '../src/auto-distill.ts'
import type { MemoryCandidate } from '../src/suggest-memory-candidates.ts'
import { DEFAULT_CONFIG } from '../src/types.ts'
import { loadAllEntries } from '../src/memory-store.ts'
import { resolveMemoryPaths } from '../src/project-root.ts'
import { rememberEntry } from '../src/remember.ts'

const baseConfig = {
  indexInjectMaxBytes: 4096,
  recallMaxBytes: 32768,
  rememberMaxBodyBytes: 16384,
  maxDomains: 64,
}

async function makeProject(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'oph-auto-distill-'))
  await mkdir(join(root, '.git'))
  return {
    root,
    cleanup: async () => {
      const { rm } = await import('node:fs/promises')
      await rm(root, { recursive: true, force: true })
    },
  }
}

function mockAgent(id = 'sess-auto'): Agent {
  return { id } as Agent
}

function candidate(overrides: Partial<MemoryCandidate> & Pick<MemoryCandidate, 'summary_hint'>): MemoryCandidate {
  return {
    kind: 'fact',
    excerpt: overrides.summary_hint,
    source: { type: 'assistant/message', seq: 1, turn: 2 },
    confidence: 'heuristic',
    suggested_domain: 'api',
    ...overrides,
  }
}

describe('auto-distill', () => {
  let cleanup: (() => Promise<void>) | undefined

  afterEach(async () => {
    await cleanup?.()
    cleanup = undefined
  })

  it('filters facts with resolvable domain only by default', () => {
    const cfg = { ...baseConfig, ...DEFAULT_CONFIG }
    const items = filterAutoDistillCandidates([
      candidate({ summary_hint: 'We always use UTC timestamps in logs' }),
      candidate({ summary_hint: 'Decision pending', kind: 'decision' }),
      candidate({ summary_hint: 'No domain hint', suggested_domain: undefined }),
    ], cfg)
    expect(items).toHaveLength(1)
    expect(items[0]!.summary_hint).toContain('UTC')
  })

  it('uses fallback domain when requireDomain is false', () => {
    const cfg = {
      ...baseConfig,
      ...DEFAULT_CONFIG,
      distillAutoRequireDomain: false,
      distillAutoFallbackDomain: 'general',
    }
    expect(resolveAutoDistillDomain(
      candidate({ summary_hint: 'x', suggested_domain: undefined }),
      cfg,
    )).toBe('general')
  })

  it('writes eligible facts and skips approval domains', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const cfg = {
      ...baseConfig,
      ...DEFAULT_CONFIG,
      distillAutoMaxWrites: 5,
      writeApprovalDomains: ['client'],
    }
    const agent = mockAgent()
    const source = { session_id: 'sess-auto', preset_id: 'code' }

    await rememberEntry(root, cfg, {
      kind: 'fact',
      domain: 'api',
      summary: 'API domain seed',
      body: 'Seed.',
    }, source)
    await rememberEntry(root, cfg, {
      kind: 'fact',
      domain: 'client',
      summary: 'Client domain seed',
      body: 'Seed.',
    }, source)

    const events = [
      {
        type: 'assistant/message',
        seq: 10,
        data: {
          turn: 3,
          message: {
            content: [{ type: 'text', text: 'Project convention: always use UTC timestamps in api logs.' }],
          },
        },
      },
      {
        type: 'assistant/message',
        seq: 11,
        data: {
          turn: 3,
          message: {
            content: [{ type: 'text', text: 'Client policy: never share client account details in public Slack.' }],
          },
        },
      },
    ]

    const result = await runAutoDistill(
      root,
      cfg,
      events,
      source,
      'compaction-end',
      agent,
    )

    expect(result.written.length).toBeGreaterThanOrEqual(1)
    expect(result.skipped.some(s => s.reason.includes('approval'))).toBe(true)

    const paths = await resolveMemoryPaths(root, cfg)
    const entries = await loadAllEntries(paths)
    expect(entries.some(e => e.frontmatter.tags?.includes('auto-distill'))).toBe(true)
  })

  it('respects session write limit', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const cfg = {
      ...baseConfig,
      ...DEFAULT_CONFIG,
      distillAutoMaxWrites: 1,
      distillAutoRequireDomain: false,
      distillAutoFallbackDomain: 'general',
    }
    const agent = mockAgent('sess-limit')

    const events = [
      {
        type: 'assistant/message',
        seq: 1,
        data: {
          turn: 2,
          message: {
            content: [{ type: 'text', text: 'Convention: always pin dependency versions in package.json.' }],
          },
        },
      },
      {
        type: 'assistant/message',
        seq: 2,
        data: {
          turn: 2,
          message: {
            content: [{ type: 'text', text: 'Convention: never commit secrets to the repository.' }],
          },
        },
      },
    ]

    const result = await runAutoDistill(
      root,
      cfg,
      events,
      { session_id: 'sess-limit' },
      'compaction-end',
      agent,
    )

    expect(result.written).toHaveLength(1)
    expect(result.skipped.some(s => s.reason.includes('limit'))).toBe(true)
  })

  it('formats bounded inject summary', () => {
    const inject = formatAutoDistillInject({
      kind: 'auto-distill-result',
      trigger: 'compaction-end',
      written: [{ id: 'mem_abc', domain: 'api', summary: 'Use UTC in logs' }],
      skipped: [{ summary_hint: 'skipped', reason: 'approval' }],
    }, 2048)
    expect(inject.text).toContain('Auto-distilled 1 fact')
    expect(inject.text).toContain('mem_abc')
    expect(inject.digest).toMatch(/^[a-f0-9]{40}$/)
  })
})
