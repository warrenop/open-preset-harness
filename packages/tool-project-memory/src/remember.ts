import {
  appendDomainBlock,
  loadAllEntries,
  memoryInitialized,
  patchEntryAtPath,
  removeEntryById,
  writeDecisionFile,
  writeIndex,
} from './memory-store.ts'
import { generateEntryId, serializeEntryBlock } from './frontmatter.ts'
import { generateIndex } from './index-generator.ts'
import { resolveMemoryPaths } from './project-root.ts'
import { markEntrySuperseded, validateSupersedePreconditions } from './supersede.ts'
import type {
  MemoryEntryFrontmatter,
  ProjectMemoryConfig,
  RememberInput,
  RememberOutput,
  RememberSource,
} from './types.ts'
import { DEFAULT_CONFIG, MemoryError } from './types.ts'
import { validateKind, validateRememberInput } from './validate.ts'
import { assertWriteAllowed } from './write-governance.ts'

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
  assertWriteAllowed(merged, input.domain, source.preset_id)

  validateKind(input.kind)
  validateRememberInput(input, merged.rememberMaxBodyBytes)

  const paths = await resolveMemoryPaths(cwd, merged)
  const entries = await loadAllEntries(paths)

  let supersedeTarget: ReturnType<typeof validateSupersedePreconditions> | undefined
  if (input.supersedes) {
    supersedeTarget = validateSupersedePreconditions(entries, input.supersedes, input.domain)
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
    ...(input.expires_at ? { expires_at: input.expires_at } : {}),
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

  if (input.supersedes) {
    try {
      await patchEntryAtPath(paths, supersedeTarget!.target.path, input.supersedes, (existing, body) => ({
        frontmatter: markEntrySuperseded(existing, id, created_at),
        body,
      }))
    }
    catch (cause) {
      try {
        await removeEntryById(paths, id)
      }
      catch {
        // best-effort rollback
      }
      if (cause instanceof MemoryError) throw cause
      throw new MemoryError(
        'SUPERSEDES_PATCH_FAILED',
        `failed to patch superseded entry ${input.supersedes}: ${String(cause)}`,
      )
    }
  }

  const allEntries = await loadAllEntries(paths)
  const indexContent = generateIndex(paths, allEntries)
  await writeIndex(paths, indexContent)

  const warnings: string[] = []
  if (supersedeTarget?.crossDomain) {
    warnings.push(
      `supersedes entry in domain ${supersedeTarget.target.frontmatter.domain}; new entry is in ${input.domain}`,
    )
  }

  return {
    kind: 'remember-result',
    id,
    path: relPath.replace(/\\/g, '/'),
    domain: input.domain,
    entry_kind: input.kind,
    created_at,
    index_updated: true,
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(supersedeTarget?.crossDomain ? { cross_domain_supersedes: true } : {}),
    ...(supersedeTarget
      ? {
          superseded_entry: {
            id: supersedeTarget.target.frontmatter.id,
            path: supersedeTarget.target.path,
            domain: supersedeTarget.target.frontmatter.domain,
          },
        }
      : {}),
  }
}

/** @param cwd - session cwd. @param config - plugin config. */
export async function isMemoryInitialized(cwd: string, config: ProjectMemoryConfig): Promise<boolean> {
  const paths = await resolveMemoryPaths(cwd, { ...DEFAULT_CONFIG, ...config })
  return memoryInitialized(paths)
}
