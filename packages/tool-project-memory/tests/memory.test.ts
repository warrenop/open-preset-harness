import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { parseEntryFrontmatter, serializeEntryBlock } from '../src/frontmatter.ts'
import { generateIndex } from '../src/index-generator.ts'
import { appendDomainBlock, loadAllEntries, writeIndex } from '../src/memory-store.ts'
import { recallEntries, memoryStatus } from '../src/recall.ts'
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

  it('flags expired entries on recall', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }
    const paths = await resolveMemoryPaths(root, config)
    const fm: MemoryEntryFrontmatter = {
      'oph-memory-schema': 1,
      id: 'mem-20260818-dead00',
      kind: 'fact',
      domain: 'security',
      created_at: '2026-08-18T06:00:00.000Z',
      summary: 'Temporary audit exception for legacy admin routes',
      confidence: 'low',
      expires_at: '2026-08-01T00:00:00.000Z',
      source: { session_id: 'sess-expired' },
    }
    await appendDomainBlock(paths, 'security', serializeEntryBlock(fm, 'Expired exception details.', true))
    await writeIndex(paths, generateIndex(paths, await loadAllEntries(paths)))

    const out = await recallEntries(root, config, { domain: 'security' })
    expect(out.entries).toHaveLength(1)
    expect(out.entries[0]?.expires_at).toBe('2026-08-01T00:00:00.000Z')
    expect(out.entries[0]?.expired).toBe(true)
  })

  it('persists expires_at from remember and recalls without expired when future', async () => {
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
        summary: 'Temporary waiver for legacy admin routes during migration',
        body: 'Remove after migration completes.',
        expires_at: '2027-08-18T00:00:00.000Z',
      },
      { session_id: 'sess-future-expiry' },
      fixed,
    )

    const out = await recallEntries(root, config, { domain: 'security' })
    expect(out.entries[0]?.expires_at).toBe('2027-08-18T00:00:00.000Z')
    expect(out.entries[0]?.expired).toBeUndefined()
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

  it('back-patches superseded entry and hides it from default recall', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }

    const old = await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Legacy admin routes allowed without MFA temporarily',
        body: 'Old policy before audit.',
      },
      { session_id: 'a' },
      new Date('2026-08-18T06:00:00.000Z'),
    )

    const newer = await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Admin routes require step-up MFA since audit',
        body: 'requireStepUp middleware.',
        supersedes: old.id,
      },
      { session_id: 'b' },
      new Date('2026-08-26T06:00:00.000Z'),
    )

    const paths = await resolveMemoryPaths(root, config)
    const entries = await loadAllEntries(paths)
    const patched = entries.find(e => e.frontmatter.id === old.id)
    expect(patched?.frontmatter.superseded_by).toBe(newer.id)
    expect(patched?.frontmatter.status).toBe('superseded')

    const active = await recallEntries(root, config, { domain: 'security' })
    expect(active.entries).toHaveLength(1)
    expect(active.entries[0]?.id).toBe(newer.id)

    const withOld = await recallEntries(root, config, { domain: 'security', include_superseded: true })
    expect(withOld.entries.some(e => e.id === old.id)).toBe(true)
  })

  it('rejects duplicate supersede of the same target', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }

    const old = await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'First fact about admin route MFA policy baseline',
        body: 'Version one.',
      },
      { session_id: 'a' },
    )

    await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Second fact replacing the first admin MFA baseline',
        body: 'Version two.',
        supersedes: old.id,
      },
      { session_id: 'b' },
    )

    await expect(rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Third fact also trying to replace the same baseline',
        body: 'Version three.',
        supersedes: old.id,
      },
      { session_id: 'c' },
    )).rejects.toMatchObject({ code: 'SUPERSEDES_TARGET_ALREADY_SUPERSEDED' })
  })

  it('rejects second forward supersede link before back-patch markers', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }
    const paths = await resolveMemoryPaths(root, config)
    const oldFm: MemoryEntryFrontmatter = {
      'oph-memory-schema': 1,
      id: 'mem-20260818-aaaaaa',
      kind: 'fact',
      domain: 'security',
      created_at: '2026-08-18T06:00:00.000Z',
      summary: 'Phase 0 style old entry without back-patch markers',
      confidence: 'medium',
      source: { session_id: 'legacy' },
    }
    const replacerFm: MemoryEntryFrontmatter = {
      ...oldFm,
      id: 'mem-20260819-bbbbbb',
      created_at: '2026-08-19T06:00:00.000Z',
      summary: 'First replacement still only forward-linked in Phase 0',
      supersedes: oldFm.id,
      source: { session_id: 'legacy-2' },
    }
    await appendDomainBlock(paths, 'security', serializeEntryBlock(oldFm, 'Old body.', true))
    await appendDomainBlock(paths, 'security', serializeEntryBlock(replacerFm, 'Replacer body.', true))
    await writeIndex(paths, generateIndex(paths, await loadAllEntries(paths)))

    await expect(rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Another replacement attempt on the same legacy target',
        body: 'Should fail.',
        supersedes: oldFm.id,
      },
      { session_id: 'legacy-3' },
    )).rejects.toMatchObject({ code: 'SUPERSEDES_ALREADY_REPLACED' })
  })

  it('deprecates superseded decision entries', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }

    const old = await rememberEntry(
      root,
      config,
      {
        kind: 'decision',
        domain: 'product',
        summary: 'Ship v1 with header-based API versioning only',
        body: 'Original decision.',
        decision_status: 'accepted',
        decision_slug: 'api-versioning-header',
      },
      { session_id: 'pm' },
      new Date('2026-08-01T06:00:00.000Z'),
    )

    await rememberEntry(
      root,
      config,
      {
        kind: 'decision',
        domain: 'product',
        summary: 'Ship v1 with URL path versioning only after review',
        body: 'Replaces header approach.',
        decision_status: 'accepted',
        decision_slug: 'api-versioning-path',
        supersedes: old.id,
      },
      { session_id: 'pm2' },
      new Date('2026-08-26T06:00:00.000Z'),
    )

    const paths = await resolveMemoryPaths(root, config)
    const entries = await loadAllEntries(paths)
    const patched = entries.find(e => e.frontmatter.id === old.id)
    expect(patched?.frontmatter.decision?.status).toBe('deprecated')
    expect(patched?.frontmatter.status).toBe('superseded')
  })

  it('warns on cross-domain supersede', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }

    const old = await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Security control for admin API routes and MFA policy',
        body: 'Security domain fact.',
      },
      { session_id: 'sec' },
    )

    const result = await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'engineering',
        summary: 'Engineering implementation note for admin API MFA rollout',
        body: 'Engineering domain fact.',
        supersedes: old.id,
      },
      { session_id: 'eng' },
    )

    expect(result.cross_domain_supersedes).toBe(true)
    expect(result.warnings?.length).toBeGreaterThan(0)
  })

  it('reports active entry counts in memory_status', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = { indexInjectMaxBytes: 4096, recallMaxBytes: 32768, rememberMaxBodyBytes: 16384, maxDomains: 64 }

    const old = await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'Old security baseline before the audit refresh cycle',
        body: 'old',
      },
      { session_id: 'a' },
    )

    await rememberEntry(
      root,
      config,
      {
        kind: 'fact',
        domain: 'security',
        summary: 'New security baseline after the audit refresh cycle',
        body: 'new',
        supersedes: old.id,
      },
      { session_id: 'b' },
    )

    const status = await memoryStatus(root, config)
    expect(status.domains.find(d => d.id === 'security')?.entry_count).toBe(2)
    expect(status.domains.find(d => d.id === 'security')?.active_entry_count).toBe(1)
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
