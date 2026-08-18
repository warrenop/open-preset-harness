import {
  appendDomainBlock,
  loadAllEntries,
  memoryInitialized,
  writeDecisionFile,
  writeIndex,
} from './memory-store.ts'
import { generateEntryId, serializeEntryBlock } from './frontmatter.ts'
import { generateIndex } from './index-generator.ts'
import { resolveMemoryPaths } from './project-root.ts'
import type {
  MemoryEntryFrontmatter,
  ProjectMemoryConfig,
  RememberInput,
  RememberOutput,
  RememberSource,
} from './types.ts'
import { DEFAULT_CONFIG, MemoryError } from './types.ts'
import { validateKind, validateRememberInput } from './validate.ts'

/**
 * Persist one distilled memory entry.
 * @param cwd - session cwd.
 * @param config - plugin config.
 * @param input - remember args.
 * @param source - provenance from current agent/session.
 * @param now - test hook for ids and timestamps.
 */
export async function rememberEntry(
  cwd: string,
  config: ProjectMemoryConfig,
  input: RememberInput,
  source: RememberSource,
  now = new Date(),
): Promise<RememberOutput> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  if (merged.readOnly) {
    throw new MemoryError('MEMORY_READ_ONLY', 'project memory is read-only')
  }
  if (merged.writeDenyDomains?.includes(input.domain)) {
    throw new MemoryError('DOMAIN_WRITE_DENIED', `writes denied for domain ${input.domain}`)
  }

  validateKind(input.kind)
  validateRememberInput(input, merged.rememberMaxBodyBytes)

  const paths = await resolveMemoryPaths(cwd, merged)
  const entries = await loadAllEntries(paths)

  if (input.supersedes) {
    const found = entries.some(e => e.frontmatter.id === input.supersedes)
    if (!found) {
      throw new MemoryError('SUPERSEDES_NOT_FOUND', `supersedes target not found: ${input.supersedes}`)
    }
  }

  const id = generateEntryId(now)
  const created_at = now.toISOString()
  const frontmatter: MemoryEntryFrontmatter = {
    'oph-memory-schema': 1,
    id,
    kind: input.kind,
    domain: input.domain,
    created_at,
    summary: input.summary.trim(),
    confidence: input.confidence ?? 'medium',
    tags: input.tags ? [...input.tags] : [],
    sensitivity: input.sensitivity ?? 'internal',
    source: {
      session_id: source.session_id,
      preset_id: source.preset_id,
      turn: source.turn,
    },
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    ...(input.kind === 'decision'
      ? {
          decision: {
            status: input.decision_status!,
          },
        }
      : {}),
  }

  let relPath: string
  if (input.kind === 'fact') {
    const block = serializeEntryBlock(frontmatter, input.body, true)
    relPath = await appendDomainBlock(paths, input.domain, block)
  }
  else {
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const block = serializeEntryBlock(frontmatter, input.body, false)
    relPath = await writeDecisionFile(paths, `${y}-${m}-${input.decision_slug!}.md`, block)
  }

  const allEntries = await loadAllEntries(paths)
  const indexContent = generateIndex(paths, allEntries)
  await writeIndex(paths, indexContent)

  return {
    kind: 'remember-result',
    id,
    path: relPath.replace(/\\/g, '/'),
    domain: input.domain,
    entry_kind: input.kind,
    created_at,
    index_updated: true,
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
  }
}

/** @param cwd - session cwd. @param config - plugin config. */
export async function isMemoryInitialized(cwd: string, config: ProjectMemoryConfig): Promise<boolean> {
  const paths = await resolveMemoryPaths(cwd, { ...DEFAULT_CONFIG, ...config })
  return memoryInitialized(paths)
}
