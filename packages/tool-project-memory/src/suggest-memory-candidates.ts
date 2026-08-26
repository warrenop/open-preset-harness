import { memoryStatus } from './recall.ts'
import type { SessionLogEvent } from './distill-reminder.ts'
import type { MemoryKind, ProjectMemoryConfig } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { truncateUtf8 } from './validate.ts'

/** One heuristic distill candidate from session log. */
export interface MemoryCandidate {
  readonly kind: MemoryKind | 'unknown'
  readonly summary_hint: string
  readonly excerpt: string
  readonly source: {
    readonly type: 'compaction/summary' | 'assistant/message'
    readonly turn?: number
    readonly seq: number
  }
  readonly suggested_domain?: string
  readonly confidence: 'heuristic'
}

export interface SuggestMemoryCandidatesInput {
  readonly since_turn?: number
  readonly max_candidates?: number
}

export interface SuggestMemoryCandidatesOutput {
  readonly kind: 'memory-candidates'
  readonly candidates: readonly MemoryCandidate[]
  readonly omitted_count: number
  readonly truncated: boolean
  readonly session_event_count: number
  readonly since_turn: number
}

const DECISION_PATTERN = /\b(decid(ed|ing)|agreed|approved|chosen|will use)\b/i
const FACT_PATTERN = /\b(convention|always|never|must|prefer|requires|default to)\b/i
const BULLET_PATTERN = /^(\*|-|•|\d+\.)\s+\S/

/** Flatten LLM message content blocks to plain text. */
function messageText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const rec = block as { type?: string; text?: string }
    if (rec.type === 'text' && typeof rec.text === 'string') parts.push(rec.text)
  }
  return parts.join('\n')
}

function classifyLine(line: string): MemoryKind | 'unknown' {
  if (DECISION_PATTERN.test(line)) return 'decision'
  if (FACT_PATTERN.test(line) || BULLET_PATTERN.test(line.trim())) return 'fact'
  return 'unknown'
}

function normalizeHint(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length <= 240 ? oneLine : `${oneLine.slice(0, 237)}...`
}

function dedupeKey(hint: string): string {
  return hint.toLowerCase().slice(0, 80)
}

/** Pick first domain id mentioned in text, if any. */
function suggestDomain(text: string, domainIds: readonly string[]): string | undefined {
  const lower = text.toLowerCase()
  for (const id of domainIds) {
    if (lower.includes(id)) return id
  }
  return undefined
}

function linesFromAssistant(event: SessionLogEvent): readonly { line: string; turn?: number }[] {
  const data = event.data as { turn?: number; message?: { content?: unknown } }
  const text = messageText(data.message?.content)
  if (!text) return []
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length >= 24 && line.length <= 480)
    .filter(line => DECISION_PATTERN.test(line) || FACT_PATTERN.test(line) || BULLET_PATTERN.test(line))
    .map(line => ({ line, turn: data.turn }))
}

/**
 * Heuristic session log scan for remember candidates (Tier 2 — no plugin LLM).
 * @param events - session log snapshot.
 * @param domainIds - known domain ids for optional hinting.
 * @param input - filter/limit args.
 * @param maxBytes - UTF-8 budget for serialized candidates body.
 */
export function suggestMemoryCandidates(
  events: readonly SessionLogEvent[],
  domainIds: readonly string[],
  input: SuggestMemoryCandidatesInput,
  maxBytes: number,
): SuggestMemoryCandidatesOutput {
  const maxCandidates = Math.min(Math.max(input.max_candidates ?? 5, 1), 10)
  const lastTurn = events.reduce((max, e) => {
    const turn = (e.data as { turn?: number }).turn
    return typeof turn === 'number' && turn > max ? turn : max
  }, 0)
  const sinceTurn = input.since_turn ?? Math.max(1, lastTurn - 5)

  const raw: MemoryCandidate[] = []

  for (const event of events) {
    if (event.type === 'compaction/summary') {
      const summary = (event.data as { summary?: unknown }).summary
      if (typeof summary !== 'string' || summary.trim().length < 16) continue
      const hint = normalizeHint(summary)
      raw.push({
        kind: 'fact',
        summary_hint: hint,
        excerpt: truncateUtf8(summary.trim(), 512),
        source: { type: 'compaction/summary', seq: event.seq },
        suggested_domain: suggestDomain(summary, domainIds),
        confidence: 'heuristic',
      })
      continue
    }

    if (event.type !== 'assistant/message') continue
    const data = event.data as { turn?: number }
    if (typeof data.turn === 'number' && data.turn < sinceTurn) continue

    for (const { line, turn } of linesFromAssistant(event)) {
      const kind = classifyLine(line)
      if (kind === 'unknown') continue
      const hint = normalizeHint(line)
      raw.push({
        kind,
        summary_hint: hint,
        excerpt: truncateUtf8(line, 512),
        source: { type: 'assistant/message', turn, seq: event.seq },
        suggested_domain: suggestDomain(line, domainIds),
        confidence: 'heuristic',
      })
    }
  }

  const seen = new Set<string>()
  const unique: MemoryCandidate[] = []
  for (const candidate of raw) {
    const key = dedupeKey(candidate.summary_hint)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(candidate)
  }

  unique.sort((a, b) => {
    if (a.source.type !== b.source.type) {
      return a.source.type === 'compaction/summary' ? -1 : 1
    }
    return b.source.seq - a.source.seq
  })

  let truncated = false
  const selected: MemoryCandidate[] = []
  let bytes = 0
  for (const candidate of unique) {
    if (selected.length >= maxCandidates) break
    const add = JSON.stringify(candidate).length
    if (bytes + add > maxBytes && selected.length > 0) {
      truncated = true
      break
    }
    selected.push(candidate)
    bytes += add
  }

  const omitted = Math.max(0, unique.length - selected.length)

  return {
    kind: 'memory-candidates',
    candidates: selected,
    omitted_count: omitted,
    truncated,
    session_event_count: events.length,
    since_turn: sinceTurn,
  }
}

/**
 * Load domain ids and scan the session log for memory candidates.
 * @param cwd - session cwd.
 * @param config - plugin config.
 * @param events - session events from agent.session.
 * @param input - tool args.
 */
export async function suggestMemoryCandidatesForSession(
  cwd: string,
  config: ProjectMemoryConfig,
  events: readonly SessionLogEvent[],
  input: SuggestMemoryCandidatesInput,
): Promise<SuggestMemoryCandidatesOutput> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const maxBytes = merged.distillAssistMaxBytes ?? DEFAULT_CONFIG.distillAssistMaxBytes!
  const status = await memoryStatus(cwd, merged)
  const domainIds = status.domains.map(d => d.id)
  return suggestMemoryCandidates(events, domainIds, input, maxBytes)
}
