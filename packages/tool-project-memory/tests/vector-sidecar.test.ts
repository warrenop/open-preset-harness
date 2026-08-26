import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { rememberEntry } from '../src/remember.ts'
import { recallEntries } from '../src/recall.ts'
import {
  buildVectorSidecar,
  cosineSimilarity,
  embedLocal,
  loadVectorSidecar,
  LOCAL_EMBED_MODEL,
  saveVectorSidecar,
  vectorSidecarPath,
} from '../src/vector-sidecar.ts'

describe('vector sidecar', () => {
  let cleanup: (() => Promise<void>) | undefined

  afterEach(async () => {
    await cleanup?.()
    cleanup = undefined
  })

  it('embedLocal is deterministic and unit-length', () => {
    const a = embedLocal('pagination opaque cursors', 64)
    const b = embedLocal('pagination opaque cursors', 64)
    expect(a).toEqual(b)
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it('similar texts score higher cosine than unrelated', () => {
    const dims = 128
    const api = embedLocal('API pagination uses opaque cursors for public endpoints', dims)
    const related = embedLocal('Public endpoints must use cursor pagination not offsets', dims)
    const unrelated = embedLocal('Client prefers Slack notifications on weekdays only', dims)
    expect(cosineSimilarity(api, related)).toBeGreaterThan(cosineSimilarity(api, unrelated))
  })

  it('persists sidecar JSON under vectors/v1.json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oph-vec-'))
    cleanup = async () => {
      const { rm } = await import('node:fs/promises')
      await rm(root, { recursive: true, force: true })
    }
    const path = vectorSidecarPath(join(root, '.dsh/memory'))
    const sidecar = buildVectorSidecar([], 32)
    await saveVectorSidecar(path, sidecar)
    const loaded = await loadVectorSidecar(path)
    expect(loaded?.model).toBe(LOCAL_EMBED_MODEL)
    const raw = await readFile(path, 'utf8')
    expect(raw).toContain('oph-vector-schema')
  })

  it('recall ranking vector uses sidecar after remember', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oph-vec-'))
    cleanup = async () => {
      const { rm } = await import('node:fs/promises')
      await rm(root, { recursive: true, force: true })
    }
    await import('node:fs/promises').then(({ mkdir }) => mkdir(join(root, '.git')))

    const config = {
      indexInjectMaxBytes: 4096,
      recallMaxBytes: 32768,
      rememberMaxBodyBytes: 16384,
      maxDomains: 64,
      vectorSidecar: true,
      vectorDimensions: 128,
    }

    await rememberEntry(root, config, {
      kind: 'fact',
      domain: 'api',
      summary: 'Pagination uses opaque cursors not offsets',
      body: 'Never expose offset pagination on public API.',
    }, { session_id: 's1' })

    await rememberEntry(root, config, {
      kind: 'fact',
      domain: 'client',
      summary: 'Client prefers Slack on weekdays',
      body: 'Avoid email on Fridays.',
    }, { session_id: 's2' })

    const out = await recallEntries(root, config, {
      query: 'cursor pagination public API',
      ranking: 'vector',
      limit: 5,
    })
    expect(out.entries.length).toBeGreaterThan(0)
    expect(out.entries[0]?.domain).toBe('api')
  })
})
