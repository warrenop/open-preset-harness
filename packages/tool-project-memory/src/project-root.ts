import { access, constants } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { PROJECT_ROOT_MARKERS } from './constants.ts'
import type { ProjectMemoryConfig, ResolvedMemoryPaths } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'

/**
 * Resolve absolute project root from cwd by walking up for markers.
 * @param cwd - starting directory.
 */
export async function resolveProjectRoot(cwd: string): Promise<string> {
  let current = resolve(cwd)
  for (;;) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      try {
        await access(join(current, marker), constants.F_OK)
        return current
      }
      catch {
        // try next marker
      }
    }
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/**
 * Resolve memory directory paths from config and cwd.
 * @param cwd - session cwd or process cwd.
 * @param config - plugin config.
 */
export async function resolveMemoryPaths(
  cwd: string,
  config: ProjectMemoryConfig = DEFAULT_CONFIG,
): Promise<ResolvedMemoryPaths> {
  const projectRoot = config.projectRoot
    ? resolve(config.projectRoot)
    : await resolveProjectRoot(cwd)
  const memoryDir = config.memoryDir ?? DEFAULT_CONFIG.memoryDir!
  const memoryRoot = join(projectRoot, memoryDir)
  return {
    projectRoot,
    memoryRoot,
    indexPath: join(memoryRoot, 'index.md'),
    domainsDir: join(memoryRoot, 'domains'),
    decisionsDir: join(memoryRoot, 'decisions'),
  }
}
