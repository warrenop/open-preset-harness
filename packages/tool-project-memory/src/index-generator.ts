import YAML from 'yaml'
import type { MemoryEntry, ResolvedMemoryPaths } from './types.ts'
import { OPH_MEMORY_SCHEMA } from './types.ts'

/**
 * Generate index.md content from entries.
 * @param paths - memory paths.
 * @param entries - all loaded entries.
 */
export function generateIndex(paths: ResolvedMemoryPaths, entries: readonly MemoryEntry[]): string {
  const domainMap = new Map<string, MemoryEntry[]>()
  for (const e of entries) {
    const list = domainMap.get(e.frontmatter.domain) ?? []
    list.push(e)
    domainMap.set(e.frontmatter.domain, list)
  }

  const now = new Date().toISOString()
  const frontmatter = {
    'oph-memory-schema': OPH_MEMORY_SCHEMA,
    'oph-index-version': 1,
    project_root: paths.projectRoot,
    updated_at: now,
    domain_count: domainMap.size,
    entry_count: entries.length,
  }

  const rows: string[] = []
  for (const [domain, list] of [...domainMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...list].sort((a, b) =>
      b.frontmatter.created_at.localeCompare(a.frontmatter.created_at),
    )
    const latest = sorted[0]!
    const lastDate = latest.frontmatter.created_at.slice(0, 10)
    rows.push(`| ${domain} | ${list.length} | ${lastDate} | ${escapePipe(latest.frontmatter.summary)} |`)
  }

  const decisions = entries
    .filter(e => e.frontmatter.kind === 'decision')
    .sort((a, b) => b.frontmatter.created_at.localeCompare(a.frontmatter.created_at))
    .slice(0, 10)

  const decisionLines = decisions.length === 0
    ? ['_(none yet)_']
    : decisions.map(e => {
        const date = e.frontmatter.created_at.slice(0, 10)
        const status = e.frontmatter.decision?.status ?? 'proposed'
        return `- **${date}** \`${e.path}\` — ${e.frontmatter.summary} (${status})`
      })

  const table = rows.length > 0
    ? rows.join('\n')
    : '| _(none)_ | 0 | — | — |'

  const body = `# Project memory index

> Shared organizational memory for this project. All presets may read.
> Use the \`recall\` tool for details; do not treat this index as exhaustive.

## Domains

| Domain | Entries | Last updated | Latest summary |
|--------|---------|--------------|----------------|
${table}

## Recent decisions

${decisionLines.join('\n')}

## How to contribute

Call \`remember\` with distilled facts. Prefer one fact per call. Tag the correct \`domain\`.
`

  return `---\n${YAML.stringify(frontmatter).trimEnd()}\n---\n\n${body}`
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|')
}
