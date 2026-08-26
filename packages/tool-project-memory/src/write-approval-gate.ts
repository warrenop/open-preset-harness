/**
 * Phase 3b — Harness approval gate for configured remember domains.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ProjectMemoryConfig } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { evaluateRememberPreExecute } from './write-governance.ts'

interface RememberToolArgs {
  domain?: string
}

/**
 * Register tools/pre-execute gate when writeApprovalDomains is non-empty.
 * ACL denials short-circuit before ask; ask uses ctx.approval when mounted.
 * @param ctx - Cordis plugin context.
 * @param config - deployment configuration.
 */
export function installRememberApprovalGate(ctx: Context, config: ProjectMemoryConfig): void {
  const merged: ProjectMemoryConfig = { ...DEFAULT_CONFIG, ...config }
  const approvalDomains = merged.writeApprovalDomains
  if (!approvalDomains || approvalDomains.length === 0) return

  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name !== 'remember') return next()

    const args = exec.arguments as RememberToolArgs
    const domain = typeof args.domain === 'string' ? args.domain : ''
    const presetId = exec.agent?.session.header.agentPreset

    const decision = evaluateRememberPreExecute(merged, domain, presetId)
    if (decision.kind === 'deny') {
      return { kind: 'deny', reason: decision.reason }
    }
    if (decision.kind === 'ask') {
      return { kind: 'ask', reason: decision.reason }
    }
    return next()
  })
}
