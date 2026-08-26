import type { ProjectMemoryConfig } from './types.ts'
import { MemoryError } from './types.ts'

/**
 * Enforce write ACL before remember (Phase 3a).
 * @param config - merged plugin config.
 * @param domain - target domain id.
 * @param presetId - agent preset id from session header, if any.
 */
export function assertWriteAllowed(
  config: ProjectMemoryConfig,
  domain: string,
  presetId?: string,
): void {
  if (config.readOnly) {
    throw new MemoryError('MEMORY_READ_ONLY', 'project memory is read-only')
  }

  if (config.writeDenyDomains?.includes(domain)) {
    throw new MemoryError('DOMAIN_WRITE_DENIED', `writes denied for domain ${domain}`)
  }

  if (presetId && config.writeDenyPresets?.includes(presetId)) {
    throw new MemoryError('PRESET_WRITE_DENIED', `writes denied for preset ${presetId}`)
  }

  const allowDomains = config.writeAllowDomains
  if (allowDomains && allowDomains.length > 0 && !allowDomains.includes(domain)) {
    throw new MemoryError(
      'DOMAIN_WRITE_NOT_ALLOWED',
      `domain ${domain} is not in writeAllowDomains`,
    )
  }

  const allowPresets = config.writeAllowPresets
  if (allowPresets && allowPresets.length > 0) {
    if (!presetId || !allowPresets.includes(presetId)) {
      throw new MemoryError(
        'PRESET_WRITE_DENIED',
        presetId
          ? `preset ${presetId} is not in writeAllowPresets`
          : 'writes require a preset listed in writeAllowPresets',
      )
    }
  }
}
