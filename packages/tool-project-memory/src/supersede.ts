import type { MemoryEntry, MemoryEntryFrontmatter } from './types.ts'
import { MemoryError } from './types.ts'

export type SupersedeMap = ReadonlyMap<string, string>

/**
 * Whether an entry is superseded (back-patch markers or legacy forward-link map).
 * @param entry - loaded memory entry.
 * @param supersededBy - reverse map from buildSupersededMap.
 */
export function isEntrySuperseded(entry: MemoryEntry, supersededBy: SupersedeMap): boolean {
  const fm = entry.frontmatter as MemoryEntryFrontmatter & {
    status?: string
    superseded_by?: string
  }
  if (fm.status === 'superseded' || fm.superseded_by) return true
  return supersededBy.has(fm.id)
}

/** @param entries - all loaded entries. @param targetId - entry id to supersede. @param newDomain - domain on the replacing entry. */
export function validateSupersedePreconditions(
  entries: readonly MemoryEntry[],
  targetId: string,
  newDomain: string,
): { target: MemoryEntry; crossDomain: boolean } {
  const target = entries.find(e => e.frontmatter.id === targetId)
  if (!target) {
    throw new MemoryError('SUPERSEDES_NOT_FOUND', `supersedes target not found: ${targetId}`)
  }

  const fm = target.frontmatter as MemoryEntryFrontmatter & {
    status?: string
    superseded_by?: string
  }
  if (fm.superseded_by || fm.status === 'superseded') {
    throw new MemoryError(
      'SUPERSEDES_TARGET_ALREADY_SUPERSEDED',
      `entry already superseded: ${targetId}`,
    )
  }

  for (const entry of entries) {
    if (entry.frontmatter.supersedes === targetId) {
      throw new MemoryError(
        'SUPERSEDES_ALREADY_REPLACED',
        `entry ${targetId} is already superseded by ${entry.frontmatter.id}`,
      )
    }
  }

  return {
    target,
    crossDomain: target.frontmatter.domain !== newDomain,
  }
}

/**
 * Build patched frontmatter for a superseded entry.
 * @param frontmatter - existing entry metadata.
 * @param supersededBy - replacing entry id.
 * @param supersededAt - ISO timestamp (usually new entry created_at).
 */
export function markEntrySuperseded(
  frontmatter: MemoryEntryFrontmatter,
  supersededBy: string,
  supersededAt: string,
): MemoryEntryFrontmatter {
  const next: MemoryEntryFrontmatter & {
    status: 'superseded'
    superseded_by: string
    superseded_at: string
  } = {
    ...frontmatter,
    status: 'superseded',
    superseded_by: supersededBy,
    superseded_at: supersededAt,
  }

  if (frontmatter.kind === 'decision') {
    return {
      ...next,
      decision: {
        ...frontmatter.decision,
        status: 'deprecated',
      },
    }
  }

  return next
}
