import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { MemoryEntry } from './types.ts'
import { buildIdfMap, tokenizeForRecall } from './recall-ranking.ts'

export const OPH_VECTOR_SCHEMA = 1 as const
export const LOCAL_EMBED_MODEL = 'local-fhash-v1' as const

/** On-disk vector index sidecar (Phase 2b). */
export interface VectorSidecar {
  readonly 'oph-vector-schema': typeof OPH_VECTOR_SCHEMA
  readonly model: typeof LOCAL_EMBED_MODEL
  readonly dimensions: number
  readonly updated_at: string
  readonly entries: Readonly<Record<string, readonly number[]>>
}

/** Default sidecar path under memory root. */
export function vectorSidecarPath(memoryRoot: string): string {
  return join(memoryRoot, 'vectors', 'v1.json')
}

/** Text used for embedding one memory entry. */
export function entryEmbedText(entry: MemoryEntry): string {
  const tags = entry.frontmatter.tags?.join(' ') ?? ''
  return `${entry.frontmatter.summary}\n${tags}\n${entry.body}`.trim()
}

function fnvBucket(term: string, dimensions: number): number {
  const hash = createHash('sha1').update(term, 'utf8').digest()
  return hash.readUInt32BE(0) % dimensions
}

function signForTerm(term: string): number {
  const hash = createHash('sha1').update(`${term}:sign`, 'utf8').digest()
  return (hash[0]! & 1) === 0 ? 1 : -1
}

/**
 * Local feature-hash embedding (no network). L2-normalized dense vector.
 * @param text - source text.
 * @param dimensions - vector width.
 * @param termWeights - optional per-term weight (e.g. IDF).
 */
export function embedLocal(
  text: string,
  dimensions: number,
  termWeights?: ReadonlyMap<string, number>,
): readonly number[] {
  const vec = new Float64Array(dimensions)
  for (const term of tokenizeForRecall(text)) {
    const w = termWeights?.get(term) ?? 1
    const bucket = fnvBucket(term, dimensions)
    vec[bucket] += signForTerm(term) * w
  }
  let norm = 0
  for (let i = 0; i < dimensions; i++) norm += vec[i]! * vec[i]!
  norm = Math.sqrt(norm) || 1
  const out: number[] = []
  for (let i = 0; i < dimensions; i++) out.push(vec[i]! / norm)
  return out
}

/** Cosine similarity for L2-normalized vectors (dot product). */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length)
  let dot = 0
  for (let i = 0; i < len; i++) dot += a[i]! * b[i]!
  return dot
}

/** Build term IDF map from entry corpus texts. */
export function buildEntryIdfMap(entries: readonly MemoryEntry[]): Map<string, number> {
  const docs = entries.map(e => tokenizeForRecall(entryEmbedText(e)))
  return buildIdfMap(docs)
}

/**
 * Rebuild full vector sidecar from active entries.
 * @param entries - memory entries to index.
 * @param dimensions - embedding width.
 * @param now - timestamp for updated_at.
 */
export function buildVectorSidecar(
  entries: readonly MemoryEntry[],
  dimensions: number,
  now = new Date(),
): VectorSidecar {
  const idf = buildEntryIdfMap(entries)
  const map: Record<string, readonly number[]> = {}
  for (const entry of entries) {
    map[entry.frontmatter.id] = embedLocal(entryEmbedText(entry), dimensions, idf)
  }
  return {
    'oph-vector-schema': OPH_VECTOR_SCHEMA,
    model: LOCAL_EMBED_MODEL,
    dimensions,
    updated_at: now.toISOString(),
    entries: map,
  }
}

/** Load sidecar or null when missing/invalid. */
export async function loadVectorSidecar(path: string): Promise<VectorSidecar | null> {
  try {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as VectorSidecar
    if (parsed['oph-vector-schema'] !== OPH_VECTOR_SCHEMA) return null
    if (parsed.model !== LOCAL_EMBED_MODEL) return null
    if (!parsed.entries || typeof parsed.entries !== 'object') return null
    return parsed
  }
  catch {
    return null
  }
}

/** Persist sidecar JSON. */
export async function saveVectorSidecar(path: string, sidecar: VectorSidecar): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(sidecar, null, 2)}\n`, 'utf8')
}

/**
 * Ensure sidecar covers all entry ids; rebuild when stale or missing.
 * @param path - sidecar file path.
 * @param entries - current entries to index.
 * @param dimensions - embedding width.
 */
export async function ensureVectorSidecar(
  path: string,
  entries: readonly MemoryEntry[],
  dimensions: number,
): Promise<VectorSidecar> {
  const existing = await loadVectorSidecar(path)
  const ids = new Set(entries.map(e => e.frontmatter.id))
  const stale = !existing
    || existing.dimensions !== dimensions
    || entries.some(e => !existing.entries[e.frontmatter.id])
    || Object.keys(existing.entries).some(id => !ids.has(id))

  const sidecar = stale ? buildVectorSidecar(entries, dimensions) : existing
  if (stale) await saveVectorSidecar(path, sidecar)
  return sidecar
}

/** Score entry by vector similarity to query embedding. */
export function scoreEntryVector(
  queryVector: readonly number[],
  entryVector: readonly number[] | undefined,
): number {
  if (!entryVector || entryVector.length === 0) return 0
  return Math.max(0, cosineSimilarity(queryVector, entryVector))
}
