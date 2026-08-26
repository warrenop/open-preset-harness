import {
  buildSupersededMap,
  loadAllEntries,
  memoryInitialized,
} from './memory-store.ts'
import { resolveMemoryPaths } from './project-root.ts'
import { isEntrySuperseded } from './supersede.ts'
import type {
  MemoryEntry,
  MemoryStatusOutput,
  ProjectMemoryConfig,
  RecallEntry,
  RecallInput,
  RecallOutput,
} from './types.ts'
import { DEFAULT_CONFIG, MemoryError, OPH_MEMORY_SCHEMA } from './types.ts'
import { normalizeRecallLimit, truncateUtf8, isEntryExpired } from './validate.ts'
import {
  buildIdfMap,
  scoreEntryLegacy,
  scoreEntryRanked,
  tokenizeForRecall,
} from './recall-ranking.ts'

/**
 * Search project memory.
 * @param cwd - session cwd.
 * @param config - plugin config.
 * @param input - recall args.
 */
export async function recallEntries(
  cwd: string,
  config: ProjectMemoryConfig,
  input: RecallInput,
): Promise<RecallOutput> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const paths = await resolveMemoryPaths(cwd, merged)

  if (!(await memoryInitialized(paths))) {
    throw new MemoryError(
      'MEMORY_NOT_INITIALIZED',
      'project memory not initialized — create .dsh/memory/index.md or call remember first',
    )
  }

  const limit = normalizeRecallLimit(input.limit)
  const kindFilter = input.kind ?? 'any'
  const query = input.query?.trim() ?? ''
  const includeSuperseded = input.include_superseded ?? false

  let entries = await loadAllEntries(paths)
  const supersededBy = buildSupersededMap(entries)

  if (input.domain) {
    const domainEntries = entries.filter(e => e.frontmatter.domain === input.domain)
    if (domainEntries.length === 0 && query.length === 0) {
      throw new MemoryError('DOMAIN_UNKNOWN', `no entries in domain ${JSON.stringify(input.domain)}`)
    }
    entries = domainEntries
  }

  entries = entries.filter(e => {
    if (kindFilter !== 'any' && e.frontmatter.kind !== kindFilter) return false
    if (!includeSuperseded && isEntrySuperseded(e, supersededBy)) return false
    return true
  })

  type Scored = { entry: MemoryEntry; score: number }
  let scored: Scored[]
  if (query.length > 0) {
    const ranking = input.ranking ?? merged.recallRanking ?? DEFAULT_CONFIG.recallRanking!
    if (ranking === 'legacy') {
      scored = entries.map(entry => ({
        entry,
        score: scoreEntryLegacy(
          query,
          entry.frontmatter.summary,
          entry.frontmatter.tags ?? [],
          entry.body,
        ),
      }))
    }
    else {
      const queryTerms = tokenizeForRecall(query)
      const queryRaw = query.toLowerCase()
      const docTokens = entries.map(e => [
        ...tokenizeForRecall(e.frontmatter.summary),
        ...e.frontmatter.tags?.flatMap(t => tokenizeForRecall(t)) ?? [],
        ...tokenizeForRecall(e.body),
      ])
      const idf = buildIdfMap(docTokens)
      scored = entries.map(entry => ({
        entry,
        score: scoreEntryRanked(
          queryTerms,
          queryRaw,
          idf,
          entry.frontmatter.summary,
          entry.frontmatter.tags ?? [],
          entry.body,
        ),
      }))
    }
    scored = scored.filter(s => s.score > 0)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.entry.frontmatter.created_at.localeCompare(a.entry.frontmatter.created_at)
    })
  }
  else {
    scored = entries.map(entry => ({ entry, score: 0 }))
    scored.sort((a, b) =>
      b.entry.frontmatter.created_at.localeCompare(a.entry.frontmatter.created_at),
    )
  }

  const matched = scored.length
  const top = scored.slice(0, limit)

  const recallEntriesOut: RecallEntry[] = []
  let bytesUsed = 0
  let truncated = false
  const perEntryBudget = Math.max(512, Math.floor(merged.recallMaxBytes / Math.max(1, limit)))

  for (const { entry } of top) {
    const fm = entry.frontmatter
    const excerpt = truncateUtf8(entry.body, perEntryBudget)
    const item: RecallEntry = {
      id: fm.id,
      kind: fm.kind,
      domain: fm.domain,
      summary: fm.summary,
      path: entry.path,
      created_at: fm.created_at,
      confidence: fm.confidence,
      tags: fm.tags ?? [],
      sensitivity: fm.sensitivity ?? 'internal',
      ...(fm.superseded_by ? { superseded_by: fm.superseded_by } : supersededBy.has(fm.id)
        ? { superseded_by: supersededBy.get(fm.id) }
        : {}),
      ...(fm.superseded_at ? { superseded_at: fm.superseded_at } : {}),
      ...(fm.expires_at ? { expires_at: fm.expires_at } : {}),
      ...(isEntryExpired(fm.expires_at) ? { expired: true as const } : {}),
      excerpt,
    }
    const itemBytes = Buffer.byteLength(JSON.stringify(item), 'utf8')
    if (bytesUsed + itemBytes > merged.recallMaxBytes) {
      truncated = true
      break
    }
    recallEntriesOut.push(item)
    bytesUsed += itemBytes
  }

  if (matched > 0 && recallEntriesOut.length === 0) {
    throw new MemoryError('RECALL_BUDGET_EXCEEDED', 'recall budget too small for matched entries')
  }

  return {
    kind: 'recall-result',
    query: query.length > 0 ? query : null,
    domain: input.domain ?? null,
    entries: recallEntriesOut,
    omitted_count: Math.max(0, matched - recallEntriesOut.length),
    truncated,
    project_root: paths.projectRoot,
    memory_dir: paths.memoryRoot,
  }
}

/**
 * Build memory_status output.
 * @param cwd - session cwd.
 * @param config - plugin config.
 */
export async function memoryStatus(
  cwd: string,
  config: ProjectMemoryConfig,
): Promise<MemoryStatusOutput> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const paths = await resolveMemoryPaths(cwd, merged)
  const initialized = await memoryInitialized(paths)

  if (!initialized) {
    return {
      kind: 'memory-status',
      initialized: false,
      project_root: paths.projectRoot,
      memory_dir: paths.memoryRoot,
      entry_count: 0,
      domain_count: 0,
      domains: [],
      recent_decisions: [],
      schema_version: OPH_MEMORY_SCHEMA,
    }
  }

  const entries = await loadAllEntries(paths)
  const supersededBy = buildSupersededMap(entries)
  const domainMap = new Map<string, { count: number; active: number; last: string | null }>()
  for (const e of entries) {
    const d = e.frontmatter.domain
    const prev = domainMap.get(d) ?? { count: 0, active: 0, last: null }
    const active = !isEntrySuperseded(e, supersededBy)
    let last = prev.last
    if (active) {
      last = last === null || e.frontmatter.created_at > last ? e.frontmatter.created_at : last
    }
    domainMap.set(d, {
      count: prev.count + 1,
      active: prev.active + (active ? 1 : 0),
      last,
    })
  }

  const domains = [...domainMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, merged.maxDomains)
    .map(([id, v]) => ({
      id,
      entry_count: v.count,
      active_entry_count: v.active,
      last_updated: v.last,
    }))

  const recent_decisions = entries
    .filter(e => e.frontmatter.kind === 'decision' && !isEntrySuperseded(e, supersededBy))
    .sort((a, b) => b.frontmatter.created_at.localeCompare(a.frontmatter.created_at))
    .slice(0, 5)
    .map(e => ({
      id: e.frontmatter.id,
      path: e.path,
      summary: e.frontmatter.summary,
      status: e.frontmatter.decision?.status ?? 'proposed',
      created_at: e.frontmatter.created_at,
    }))

  return {
    kind: 'memory-status',
    initialized: true,
    project_root: paths.projectRoot,
    memory_dir: paths.memoryRoot,
    entry_count: entries.length,
    domain_count: domainMap.size,
    domains,
    recent_decisions,
    schema_version: OPH_MEMORY_SCHEMA,
  }
}
