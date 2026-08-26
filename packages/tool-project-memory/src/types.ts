/** Shared types for project memory — see docs/phase-0-memory-api.md. */

export const OPH_MEMORY_SCHEMA = 1 as const

export type MemoryKind = 'fact' | 'decision'
export type Confidence = 'low' | 'medium' | 'high'
export type Sensitivity = 'public' | 'internal' | 'restricted'
export type DecisionStatus = 'proposed' | 'accepted' | 'deprecated'
export type EntryStatus = 'superseded'

/** YAML frontmatter for one memory entry. */
export interface MemoryEntryFrontmatter {
  readonly 'oph-memory-schema': typeof OPH_MEMORY_SCHEMA
  readonly id: string
  readonly kind: MemoryKind
  readonly domain: string
  readonly created_at: string
  readonly summary: string
  readonly confidence: Confidence
  readonly tags?: readonly string[]
  readonly sensitivity?: Sensitivity
  readonly supersedes?: string
  readonly superseded_by?: string
  readonly superseded_at?: string
  readonly status?: EntryStatus
  readonly related?: readonly string[]
  readonly expires_at?: string
  readonly locale?: string
  readonly source: {
    readonly session_id: string
    readonly preset_id?: string
    readonly turn?: number
  }
  readonly decision?: {
    readonly status: DecisionStatus
    readonly stakeholders?: readonly string[]
    readonly alternatives_considered?: number
  }
}

/** Parsed entry on disk. */
export interface MemoryEntry {
  readonly frontmatter: MemoryEntryFrontmatter
  readonly body: string
  /** Path relative to memory root, e.g. domains/security.md or decisions/2026-08-x.md */
  readonly path: string
  /** Byte offset of this block within path (for debugging). */
  readonly blockIndex: number
}

export interface RecallEntry {
  readonly id: string
  readonly kind: MemoryKind
  readonly domain: string
  readonly summary: string
  readonly path: string
  readonly created_at: string
  readonly confidence: Confidence
  readonly tags: readonly string[]
  readonly sensitivity: Sensitivity
  readonly superseded_by?: string
  readonly superseded_at?: string
  /** Present when frontmatter expires_at is set. */
  readonly expires_at?: string
  /** True when expires_at is in the past — verify before relying on the entry. */
  readonly expired?: true
  readonly excerpt: string
}

export interface RecallOutput {
  readonly kind: 'recall-result'
  readonly query: string | null
  readonly domain: string | null
  readonly entries: readonly RecallEntry[]
  readonly omitted_count: number
  readonly truncated: boolean
  readonly project_root: string
  readonly memory_dir: string
}

export interface RememberOutput {
  readonly kind: 'remember-result'
  readonly id: string
  readonly path: string
  readonly domain: string
  readonly entry_kind: MemoryKind
  readonly created_at: string
  readonly index_updated: boolean
  readonly supersedes?: string
  readonly warnings?: readonly string[]
  readonly cross_domain_supersedes?: boolean
  readonly superseded_entry?: {
    readonly id: string
    readonly path: string
    readonly domain: string
  }
}

export interface MemoryStatusOutput {
  readonly kind: 'memory-status'
  readonly initialized: boolean
  readonly project_root: string
  readonly memory_dir: string
  readonly entry_count: number
  readonly domain_count: number
  readonly domains: readonly {
    readonly id: string
    readonly entry_count: number
    readonly active_entry_count: number
    readonly last_updated: string | null
  }[]
  readonly recent_decisions: readonly {
    readonly id: string
    readonly path: string
    readonly summary: string
    readonly status: string
    readonly created_at: string
  }[]
  readonly schema_version: typeof OPH_MEMORY_SCHEMA
}

export type MemoryErrorCode =
  | 'MEMORY_NOT_INITIALIZED'
  | 'DOMAIN_UNKNOWN'
  | 'RECALL_BUDGET_EXCEEDED'
  | 'MEMORY_READ_FAILED'
  | 'MEMORY_READ_ONLY'
  | 'DOMAIN_WRITE_DENIED'
  | 'VALIDATION_FAILED'
  | 'SUPERSEDES_NOT_FOUND'
  | 'SUPERSEDES_ALREADY_REPLACED'
  | 'SUPERSEDES_TARGET_ALREADY_SUPERSEDED'
  | 'SUPERSEDES_PATCH_FAILED'
  | 'MEMORY_WRITE_FAILED'

/** Expected domain failure surfaced to tool execute. */
export class MemoryError extends Error {
  readonly code: MemoryErrorCode

  constructor(code: MemoryErrorCode, message: string) {
    super(message)
    this.name = 'MemoryError'
    this.code = code
  }
}

export interface ResolvedMemoryPaths {
  readonly projectRoot: string
  readonly memoryRoot: string
  readonly indexPath: string
  readonly domainsDir: string
  readonly decisionsDir: string
}

export interface RememberInput {
  readonly kind: MemoryKind
  readonly domain: string
  readonly summary: string
  readonly body: string
  readonly tags?: readonly string[]
  readonly confidence?: Confidence
  readonly supersedes?: string
  readonly sensitivity?: Sensitivity
  readonly decision_status?: DecisionStatus
  readonly decision_slug?: string
  /** Optional ISO 8601 UTC expiry; recall sets expired when past. */
  readonly expires_at?: string
}

export interface RecallInput {
  readonly query?: string
  readonly domain?: string
  readonly kind?: MemoryKind | 'any'
  readonly limit?: number
  readonly include_superseded?: boolean
}

export interface RememberSource {
  readonly session_id: string
  readonly preset_id?: string
  readonly turn?: number
}

export interface ProjectMemoryConfig {
  readonly projectRoot?: string
  readonly memoryDir?: string
  readonly indexInjectMaxBytes: number
  readonly recallMaxBytes: number
  readonly rememberMaxBodyBytes: number
  readonly maxDomains: number
  readonly readOnly?: boolean
  readonly writeDenyDomains?: readonly string[]
}

export const DEFAULT_CONFIG: ProjectMemoryConfig = {
  memoryDir: '.dsh/memory',
  indexInjectMaxBytes: 4096,
  recallMaxBytes: 32768,
  rememberMaxBodyBytes: 16384,
  maxDomains: 64,
  readOnly: false,
  writeDenyDomains: [],
}
