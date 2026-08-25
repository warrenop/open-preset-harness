import type { ToolResultView } from '@deepseek-ai/dsh-tools'
import type { RecallOutput, RememberOutput } from './types.ts'

/** Persisted recall presentation metadata (session log + replay). */
export interface RecallPresentationMeta {
  readonly entries: readonly {
    readonly id: string
    readonly domain: string
    readonly expired?: true
  }[]
  readonly expired_count: number
}

/** Persisted remember presentation metadata. */
export interface RememberPresentationMeta {
  readonly id: string
  readonly domain: string
  readonly path: string
  readonly entry_kind: string
}

interface ToolResultLike {
  readonly isError?: boolean
  readonly meta?: unknown
}

/** @param value - recall tool output. */
export function recallPresentationMeta(_args: unknown, value: RecallOutput): RecallPresentationMeta {
  return {
    entries: value.entries.map(e => ({
      id: e.id,
      domain: e.domain,
      ...(e.expired ? { expired: true as const } : {}),
    })),
    expired_count: value.entries.filter(e => e.expired).length,
  }
}

/** @param value - remember tool output. */
export function rememberPresentationMeta(_args: unknown, value: RememberOutput): RememberPresentationMeta {
  return {
    id: value.id,
    domain: value.domain,
    path: value.path,
    entry_kind: value.entry_kind,
  }
}

function readRecallMeta(result: ToolResultLike): RecallPresentationMeta | undefined {
  if (!result.meta || typeof result.meta !== 'object') return undefined
  return result.meta as RecallPresentationMeta
}

function readRememberMeta(result: ToolResultLike): RememberPresentationMeta | undefined {
  if (!result.meta || typeof result.meta !== 'object') return undefined
  return result.meta as RememberPresentationMeta
}

/** Completed recall card — entry ids and domains from persisted meta. */
export function recallPresentResult(_args: unknown, result: ToolResultLike): ToolResultView | undefined {
  if (result.isError) return undefined
  const meta = readRecallMeta(result)
  if (!meta?.entries.length) {
    return { card: 'generic', title: 'No project memory matches' }
  }
  const domains = [...new Set(meta.entries.map(e => e.domain))]
  const title = meta.entries.length === 1
    ? `${meta.entries[0]!.id} · ${meta.entries[0]!.domain}`
    : `${meta.entries.length} entries · ${domains.join(', ')}`
  const expiredNote = meta.expired_count > 0
    ? `${meta.expired_count} expired`
    : undefined
  return {
    card: 'generic',
    title: expiredNote ? `${title} (${expiredNote})` : title,
  }
}

/** Completed remember card — entry id and domain from persisted meta. */
export function rememberPresentResult(_args: unknown, result: ToolResultLike): ToolResultView | undefined {
  if (result.isError) return undefined
  const meta = readRememberMeta(result)
  if (!meta) return undefined
  return {
    card: 'generic',
    title: `${meta.id} · ${meta.domain}`,
  }
}
