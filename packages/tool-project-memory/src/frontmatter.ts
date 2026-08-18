import { createHash, randomBytes } from 'node:crypto'
import YAML from 'yaml'
import { ENTRY_ID_PATTERN, ENTRY_SEPARATOR } from './constants.ts'
import type { MemoryEntryFrontmatter } from './types.ts'
import { OPH_MEMORY_SCHEMA } from './types.ts'

/**
 * Split YAML frontmatter from Markdown body.
 * @param raw - file or block content.
 * @returns parsed parts or null when frontmatter missing.
 */
export function splitFrontmatter(raw: string): { yaml: string; body: string } | null {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith('---')) return null
  const end = trimmed.indexOf('\n---', 3)
  if (end === -1) return null
  const yaml = trimmed.slice(3, end).trim()
  const body = trimmed.slice(end + 4).replace(/^\n/, '')
  return { yaml, body }
}

/**
 * Parse and minimally validate entry frontmatter.
 * @param raw - block including frontmatter.
 */
export function parseEntryFrontmatter(raw: string): { frontmatter: MemoryEntryFrontmatter; body: string } {
  const parts = splitFrontmatter(raw)
  if (!parts) {
    throw new Error('entry missing YAML frontmatter')
  }
  const obj = YAML.parse(parts.yaml) as Record<string, unknown>
  validateFrontmatterShape(obj)
  return {
    frontmatter: obj as unknown as MemoryEntryFrontmatter,
    body: parts.body.trim(),
  }
}

/**
 * Serialize frontmatter + body to a disk block.
 * @param frontmatter - validated entry metadata.
 * @param body - markdown body.
 * @param trailingSeparator - append domain log separator after block.
 */
export function serializeEntryBlock(
  frontmatter: MemoryEntryFrontmatter,
  body: string,
  trailingSeparator = false,
): string {
  const yaml = YAML.stringify(frontmatter).trimEnd()
  const block = `---\n${yaml}\n---\n\n${body.trim()}\n`
  return trailingSeparator ? `${block}${ENTRY_SEPARATOR}` : block
}

/**
 * SHA-1 hex digest of UTF-8 content (for index inject dedup).
 * @param content - file content.
 */
export function digestContent(content: string): string {
  return createHash('sha1').update(content, 'utf8').digest('hex')
}

/**
 * Generate a new entry id: mem-YYYYMMDD-<6 hex>.
 * @param now - injection point for tests.
 */
export function generateEntryId(now = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const suffix = randomBytes(3).toString('hex')
  return `mem-${y}${m}${d}-${suffix}`
}

/** @param id - candidate entry id. */
export function isValidEntryId(id: string): boolean {
  return ENTRY_ID_PATTERN.test(id)
}

function validateFrontmatterShape(obj: Record<string, unknown>): void {
  if (obj['oph-memory-schema'] !== OPH_MEMORY_SCHEMA) {
    throw new Error(`oph-memory-schema must be ${OPH_MEMORY_SCHEMA}`)
  }
  for (const key of ['id', 'kind', 'domain', 'created_at', 'summary', 'confidence', 'source'] as const) {
    if (obj[key] === undefined || obj[key] === null) {
      throw new Error(`frontmatter missing required field: ${key}`)
    }
  }
  const source = obj.source
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    throw new Error('frontmatter.source must be an object')
  }
  if (typeof (source as Record<string, unknown>).session_id !== 'string') {
    throw new Error('frontmatter.source.session_id required')
  }
}
