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
  /** Present when vectorSidecar is enabled and sidecar exists. */
  readonly vector_sidecar?: {
    readonly enabled: true
    readonly model: string
    readonly indexed_count: number
    readonly dimensions: number
    readonly updated_at: string | null
  }
}

export type MemoryErrorCode =
  | 'MEMORY_NOT_INITIALIZED'
  | 'DOMAIN_UNKNOWN'
  | 'RECALL_BUDGET_EXCEEDED'
  | 'VECTOR_SIDECAR_DISABLED'
  | 'MEMORY_READ_FAILED'
  | 'MEMORY_READ_ONLY'
  | 'DOMAIN_WRITE_DENIED'
  | 'DOMAIN_WRITE_NOT_ALLOWED'
  | 'PRESET_WRITE_DENIED'
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
  /** Ranking mode when query is set. Default from config (`token`). */
  readonly ranking?: 'token' | 'legacy' | 'vector'
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
  /** When non-empty, only these domains may be written (Phase 3a). */
  readonly writeAllowDomains?: readonly string[]
  /** Presets blocked from remember (Phase 3a). */
  readonly writeDenyPresets?: readonly string[]
  /** When non-empty, only these presets may call remember (Phase 3a). */
  readonly writeAllowPresets?: readonly string[]
  /** Domains that require Harness approval before remember (Phase 3b). */
  readonly writeApprovalDomains?: readonly string[]
  /** Tier 1a: inject turn-end remember reminder. Default: false */
  readonly distillReminder?: boolean
  /** Max UTF-8 bytes for distill reminder inject. Default: 2048 */
  readonly distillReminderMaxBytes?: number
  /** Minimum turns before first reminder. Default: 2 */
  readonly distillReminderMinTurn?: number
  /** Tier 1b: inject after successful compaction/end. Default: false */
  readonly distillCompactionReminder?: boolean
  /** Tier 2: register suggest_memory_candidates tool. Default: false */
  readonly distillAssist?: boolean
  /** Max UTF-8 bytes for suggest_memory_candidates output. Default: 8192 */
  readonly distillAssistMaxBytes?: number
  /** Tier 3: auto-write eligible heuristic candidates. Default: false */
  readonly distillAuto?: boolean
  /** Tier 3 trigger hook. Default: compaction-end */
  readonly distillAutoTrigger?: 'turn-stopping' | 'compaction-end'
  /** Max auto remember calls per session. Default: 3 */
  readonly distillAutoMaxWrites?: number
  /** Only auto-write facts. Default: true */
  readonly distillAutoFactsOnly?: boolean
  /** Require suggested_domain on candidate. Default: true */
  readonly distillAutoRequireDomain?: boolean
  /** Skip writeApprovalDomains (no auto-approval). Default: true */
  readonly distillAutoSkipApprovalDomains?: boolean
  /** Fallback domain when requireDomain is false. Default: general */
  readonly distillAutoFallbackDomain?: string
  /** Recall ranking when query is set. Default: token (Phase 2a). */
  readonly recallRanking?: 'token' | 'legacy' | 'vector'
  /** Tier 2b: maintain vector sidecar on remember. Default: false */
  readonly vectorSidecar?: boolean
  /** Vector dimensions for local-fhash-v1. Default: 256 */
  readonly vectorDimensions?: number
}

export const DEFAULT_CONFIG: ProjectMemoryConfig = {
  memoryDir: '.dsh/memory',
  indexInjectMaxBytes: 4096,
  recallMaxBytes: 32768,
  rememberMaxBodyBytes: 16384,
  maxDomains: 64,
  readOnly: false,
  writeDenyDomains: [],
  writeAllowDomains: [],
  writeDenyPresets: [],
  writeAllowPresets: [],
  writeApprovalDomains: [],
  distillReminder: false,
  distillReminderMaxBytes: 2048,
  distillReminderMinTurn: 2,
  distillCompactionReminder: false,
  distillAssist: false,
  distillAssistMaxBytes: 8192,
  distillAuto: false,
  distillAutoTrigger: 'compaction-end',
  distillAutoMaxWrites: 3,
  distillAutoFactsOnly: true,
  distillAutoRequireDomain: true,
  distillAutoSkipApprovalDomains: true,
  distillAutoFallbackDomain: 'general',
  recallRanking: 'token',
  vectorSidecar: false,
  vectorDimensions: 256,
}
