import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { parseEntryFrontmatter, serializeEntryBlock } from '../src/frontmatter.ts'
import { generateIndex } from '../src/index-generator.ts'
import { appendDomainBlock, loadAllEntries, writeIndex } from '../src/memory-store.ts'
import { recallEntries } from '../src/recall.ts'
import { rememberEntry } from '../src/remember.ts'
import { resolveMemoryPaths } from '../src/project-root.ts'
import type { MemoryEntryFrontmatter } from '../src/types.ts'

async function makeProject(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'oph-mem-'))
  await mkdir(join(root, '.git'))
  return {
    root,
    cleanup: async () => {
      const { rm } = await import('node:fs/promises')
      await rm(root, { recursive: true, force: true })
    },
  }
}

describe('remember and recall', () => {
  let cleanup: (() => Promise<void>) | undefined

  afterEach(async () => {
    await cleanup?.()
    cleanup = undefined
  })

  it('writes a fact, regenerates index, and recalls by domain', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }
    const fixed = new Date('2026-08-18T06:00:00.000Z')

    await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Admin routes require step-up MFA since audit',
        body: 'Applies to /admin/* — middleware requireStepUp.',
        tags: ['auth'],
        confidence: 'high',
      },
      { session_id: 'sess-1', preset_id: 'security-review' },
      fixed,
    )

    const paths = await resolveMemoryPaths(root, config)
    const index = await readFile(paths.indexPath, 'utf8')
    expect(index).toContain('security')
    expect(index).toContain('Admin routes require step-up MFA')

    const out = await recallEntries(root, config, { domain: 'security' })
    expect(out.entries).toHaveLength(1)
    expect(out.entries[0]?.id).toMatch(/^mem-20260818-[a-f0-9]{6}$/)
    expect(out.entries[0]?.summary).toContain('MFA')
  })

  it('recalls by query ranking', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }

    await rememberEntry(root, config, {
      kind: 'fact',
      domain: 'api',
      summary: 'Pagination uses opaque cursors not offsets',
      body: 'Never expose offset pagination on public API.',
    }, { session_id: 'a' })

    await rememberEntry(root, config, {
      kind: 'fact',
      domain: 'client',
      summary: 'Client prefers Slack notifications on weekdays',
      body: 'Avoid email on Fridays.',
    }, { session_id: 'b' })

    const out = await recallEntries(root, config, { query: 'pagination', limit: 5 })
    expect(out.entries).toHaveLength(1)
    expect(out.entries[0]?.domain).toBe('api')
  })

  it('writes decision files under decisions/', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }
    const fixed = new Date('2026-08-18T06:00:00.000Z')

    const result = await rememberEntry(
      root,
      config,
      {
        kind: 'decision',
        domain: 'product',
        summary: 'Ship v1 with URL path versioning only',
        body: 'Rejected header versioning due to CDN cache complexity.',
        decision_status: 'accepted',
        decision_slug: 'api-versioning-v1',
      },
      { session_id: 'sess-pm' },
      fixed,
    )

    expect(result.path).toMatch(/^decisions\/2026-08-api-versioning-v1\.md$/)
    const paths = await resolveMemoryPaths(root, config)
    const raw = await readFile(join(paths.memoryRoot, result.path), 'utf8')
    const parsed = parseEntryFrontmatter(raw)
    expect(parsed.frontmatter.kind).toBe('decision')
    expect(parsed.frontmatter.decision?.status).toBe('accepted')
  })
})

describe('frontmatter and index generator', () => {
  let cleanup: (() => Promise<void>) | undefined

  afterEach(async () => {
    await cleanup?.()
    cleanup = undefined
  })

  it('round-trips entry blocks', () => {
    const fm: MemoryEntryFrontmatter = {
      'oph-memory-schema': 1,
      id: 'mem-20260818-abcdef',
      kind: 'fact',
      domain: 'example',
      created_at: '2026-08-18T06:00:00.000Z',
      summary: 'Example summary for round trip test',
      confidence: 'medium',
      source: { session_id: 'test' },
    }
    const block = serializeEntryBlock(fm, 'Body text here.', false)
    const parsed = parseEntryFrontmatter(block)
    expect(parsed.frontmatter.id).toBe(fm.id)
    expect(parsed.body).toBe('Body text here.')
  })

  it('generates index from entries', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const paths = await resolveMemoryPaths(root, {
      indexInjectMaxBytes: 4096,
      recallMaxBytes: 32768,
      rememberMaxBodyBytes: 16384,
      maxDomains: 64,
    })
    const fm: MemoryEntryFrontmatter = {
      'oph-memory-schema': 1,
      id: 'mem-20260818-abc123',
      kind: 'fact',
      domain: 'onboarding',
      created_at: '2026-08-18T06:00:00.000Z',
      summary: 'Run pnpm verify before first PR',
      confidence: 'high',
      source: { session_id: 'x' },
    }
    await appendDomainBlock(paths, 'onboarding', serializeEntryBlock(fm, 'Details.', true))
    const entries = await loadAllEntries(paths)
    const index = generateIndex(paths, entries)
    await writeIndex(paths, index)
    expect(index).toContain('onboarding')
    expect(index).toContain('pnpm verify')
  })
})
