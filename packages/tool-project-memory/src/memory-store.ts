import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { ENTRY_SEPARATOR } from './constants.ts'
import { parseEntryFrontmatter, serializeEntryBlock } from './frontmatter.ts'
import type { MemoryEntry, MemoryEntryFrontmatter, ResolvedMemoryPaths } from './types.ts'
import { MemoryError } from './types.ts'

/**
 * Read all memory entries from domains/ and decisions/.
 * @param paths - resolved memory paths.
 */
export async function loadAllEntries(paths: ResolvedMemoryPaths): Promise<MemoryEntry[]> {
  const entries: MemoryEntry[] = []
  try {
    entries.push(...await loadDomainEntries(paths))
    entries.push(...await loadDecisionEntries(paths))
  }
  catch (cause) {
    throw new MemoryError('MEMORY_READ_FAILED', `failed to read memory: ${String(cause)}`)
  }
  return entries
}

async function loadDomainEntries(paths: ResolvedMemoryPaths): Promise<MemoryEntry[]> {
  const entries: MemoryEntry[] = []
  let files: string[]
  try {
    files = await readdir(paths.domainsDir)
  }
  catch {
    return entries
  }
  for (const file of files.sort()) {
    if (!file.endsWith('.md')) continue
    const rel = join('domains', file)
    const full = join(paths.domainsDir, file)
    const raw = await readFile(full, 'utf8')
    entries.push(...parseDomainFile(raw, rel))
  }
  return entries
}

async function loadDecisionEntries(paths: ResolvedMemoryPaths): Promise<MemoryEntry[]> {
  const entries: MemoryEntry[] = []
  let files: string[]
  try {
    files = await readdir(paths.decisionsDir)
  }
  catch {
    return entries
  }
  for (const file of files.sort()) {
    if (!file.endsWith('.md')) continue
    const rel = join('decisions', file)
    const full = join(paths.decisionsDir, file)
    const raw = await readFile(full, 'utf8')
    const parsed = parseEntryFrontmatter(raw)
    entries.push({ ...parsed, path: rel, blockIndex: 0 })
  }
  return entries
}

/**
 * Split a domain log file into entry blocks.
 * @param raw - full file content.
 * @param relPath - path relative to memory root.
 */
export function parseDomainFile(raw: string, relPath: string): MemoryEntry[] {
  const entries: MemoryEntry[] = []
  const blocks = raw.split(ENTRY_SEPARATOR).map(b => b.trim()).filter(Boolean)
  blocks.forEach((block, blockIndex) => {
    const parsed = parseEntryFrontmatter(block)
    entries.push({ ...parsed, path: relPath, blockIndex })
  })
  return entries
}

/**
 * Append a serialized fact block to domains/<domain>.md.
 * @param paths - memory paths.
 * @param domain - domain id.
 * @param block - serialized entry block with trailing separator.
 */
export async function appendDomainBlock(
  paths: ResolvedMemoryPaths,
  domain: string,
  block: string,
): Promise<string> {
  await mkdir(paths.domainsDir, { recursive: true })
  const rel = join('domains', `${domain}.md`)
  const full = join(paths.memoryRoot, rel)
  let existing = ''
  try {
    existing = await readFile(full, 'utf8')
  }
  catch {
    // new file
  }
  const normalizedBlock = block.split(ENTRY_SEPARATOR)[0]!.trim()
  const blocks = existing.length > 0 ? splitDomainBlocks(existing) : []
  blocks.push(normalizedBlock)
  await writeDomainBlocksFile(full, blocks)
  return rel
}

/**
 * Write a decision file.
 * @param paths - memory paths.
 * @param filename - e.g. 2026-08-slug.md
 * @param block - serialized entry without extra separator.
 */
export async function writeDecisionFile(
  paths: ResolvedMemoryPaths,
  filename: string,
  block: string,
): Promise<string> {
  await mkdir(paths.decisionsDir, { recursive: true })
  const rel = join('decisions', filename)
  await writeFile(join(paths.memoryRoot, rel), block, 'utf8')
  return rel
}

/**
 * Write index.md content.
 * @param paths - memory paths.
 * @param content - full index file.
 */
export async function writeIndex(paths: ResolvedMemoryPaths, content: string): Promise<void> {
  await mkdir(paths.memoryRoot, { recursive: true })
  await writeFile(paths.indexPath, content, 'utf8')
}

/**
 * Read index.md if present.
 * @param paths - memory paths.
 */
export async function readIndex(paths: ResolvedMemoryPaths): Promise<string | null> {
  try {
    return await readFile(paths.indexPath, 'utf8')
  }
  catch {
    return null
  }
}

/** @param paths - memory paths. */
export async function memoryInitialized(paths: ResolvedMemoryPaths): Promise<boolean> {
  try {
    await readFile(paths.indexPath, 'utf8')
    return true
  }
  catch {
    return false
  }
}

/**
 * Build superseded-by map from all supersedes links.
 * @param entries - loaded entries.
 */
export function buildSupersededMap(entries: readonly MemoryEntry[]): Map<string, string> {
  const byId = new Map(entries.map(e => [e.frontmatter.id, e.frontmatter]))
  const supersededBy = new Map<string, string>()
  for (const entry of entries) {
    const fm = entry.frontmatter
    if (fm.superseded_by) {
      supersededBy.set(fm.id, fm.superseded_by)
    }
    const target = fm.supersedes
    if (target && byId.has(target)) {
      supersededBy.set(target, entry.frontmatter.id)
    }
  }
  return supersededBy
}

type EntryPatch = (
  frontmatter: MemoryEntryFrontmatter,
  body: string,
) => { frontmatter: MemoryEntryFrontmatter; body: string }

/**
 * Rewrite one entry block identified by stable id.
 * @param paths - memory paths.
 * @param entryId - target entry id.
 * @param patch - frontmatter/body transform.
 */
export async function patchEntryById(
  paths: ResolvedMemoryPaths,
  entryId: string,
  patch: EntryPatch,
): Promise<void> {
  const entries = await loadAllEntries(paths)
  const target = entries.find(e => e.frontmatter.id === entryId)
  if (!target) {
    throw new MemoryError('SUPERSEDES_NOT_FOUND', `entry not found for patch: ${entryId}`)
  }

  await patchEntryAtPath(paths, target.path, entryId, patch)
}

/**
 * Patch one entry within a known memory-relative path.
 * @param paths - memory paths.
 * @param relPath - path relative to memory root.
 * @param entryId - stable entry id.
 * @param patch - frontmatter/body transform.
 */
export async function patchEntryAtPath(
  paths: ResolvedMemoryPaths,
  relPath: string,
  entryId: string,
  patch: EntryPatch,
): Promise<void> {
  const fullPath = join(paths.memoryRoot, relPath)
  const raw = await readFile(fullPath, 'utf8')

  if (relPath.startsWith('decisions/')) {
    const parsed = parseEntryFrontmatter(raw)
    if (parsed.frontmatter.id !== entryId) {
      throw new MemoryError('SUPERSEDES_NOT_FOUND', `entry id mismatch in ${relPath}`)
    }
    const next = patch(parsed.frontmatter, parsed.body)
    await writeFile(fullPath, serializeEntryBlock(next.frontmatter, next.body, false), 'utf8')
    return
  }

  const blocks = splitDomainBlocks(raw)
  const nextBlocks: string[] = []
  let found = false
  for (const block of blocks) {
    const parsed = parseEntryFrontmatter(block)
    if (parsed.frontmatter.id === entryId) {
      const next = patch(parsed.frontmatter, parsed.body)
      nextBlocks.push(serializeEntryBlock(next.frontmatter, next.body, false).trim())
      found = true
    }
    else {
      nextBlocks.push(block)
    }
  }

  if (!found) {
    throw new MemoryError('SUPERSEDES_NOT_FOUND', `entry block missing in file: ${entryId}`)
  }

  await writeDomainBlocksFile(fullPath, nextBlocks)
}

/**
 * Remove one entry block (rollback after failed supersede patch).
 * @param paths - memory paths.
 * @param entryId - entry id to remove.
 */
export async function removeEntryById(paths: ResolvedMemoryPaths, entryId: string): Promise<void> {
  const entries = await loadAllEntries(paths)
  const target = entries.find(e => e.frontmatter.id === entryId)
  if (!target) return

  const fullPath = join(paths.memoryRoot, target.path)
  if (target.path.startsWith('decisions/')) {
    await unlink(fullPath)
    return
  }

  const raw = await readFile(fullPath, 'utf8')
  const remaining = splitDomainBlocks(raw).filter(block => {
    try {
      return parseEntryFrontmatter(block).frontmatter.id !== entryId
    }
    catch {
      return true
    }
  })

  if (remaining.length === 0) {
    await unlink(fullPath)
    return
  }

  await writeDomainBlocksFile(fullPath, remaining)
}

function splitDomainBlocks(raw: string): string[] {
  return raw.split(ENTRY_SEPARATOR).map(b => b.trim()).filter(Boolean)
}

async function writeDomainBlocksFile(fullPath: string, blocks: readonly string[]): Promise<void> {
  const content = blocks.map(b => b.trim()).join(ENTRY_SEPARATOR)
  await writeFile(fullPath, `${content}\n`, 'utf8')
}

/** Relative path from memory root for display. */
export function relMemoryPath(paths: ResolvedMemoryPaths, absPath: string): string {
  return relative(paths.memoryRoot, absPath).replace(/\\/g, '/')
}
