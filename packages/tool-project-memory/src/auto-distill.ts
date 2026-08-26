/**
 * Tier 3 — heuristic auto-distill: promote Tier 2 candidates to rememberEntry.
 * No plugin LLM; respects Phase 3 write ACL and skips approval domains by default.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { digestContent } from './frontmatter.ts'
import {
  findCompactionSummaryBeforeEnd,
  type SessionLogEvent,
} from './distill-reminder.ts'
import { memoryStatus } from './recall.ts'
import { rememberEntry } from './remember.ts'
import {
  suggestMemoryCandidates,
  type MemoryCandidate,
} from './suggest-memory-candidates.ts'
import type { ProjectMemoryConfig, RememberSource } from './types.ts'
import { DEFAULT_CONFIG, MemoryError } from './types.ts'
import { truncateUtf8 } from './validate.ts'
import { assertWriteAllowed } from './write-governance.ts'

const AUTO_DISTILL_KIND = 'auto-distill-v1'

export type AutoDistillTrigger = 'turn-stopping' | 'compaction-end'

export interface AutoDistillWritten {
  readonly id: string
  readonly domain: string
  readonly summary: string
}

export interface AutoDistillSkipped {
  readonly summary_hint: string
  readonly reason: string
}

export interface AutoDistillResult {
  readonly kind: 'auto-distill-result'
  readonly trigger: AutoDistillTrigger
  readonly written: readonly AutoDistillWritten[]
  readonly skipped: readonly AutoDistillSkipped[]
}

/** Per-session auto-write budget and dedupe. */
interface SessionAutoState {
  writeCount: number
  hintDigests: Set<string>
}

const sessionAutoState = new WeakMap<Agent, SessionAutoState>()

function sessionState(agent: Agent): SessionAutoState {
  let state = sessionAutoState.get(agent)
  if (!state) {
    state = { writeCount: 0, hintDigests: new Set() }
    sessionAutoState.set(agent, state)
  }
  return state
}

function hintDigest(hint: string): string {
  return digestContent(`${AUTO_DISTILL_KIND}:${hint.toLowerCase().slice(0, 120)}`)
}

/** Resolve domain for one candidate. */
export function resolveAutoDistillDomain(
  candidate: MemoryCandidate,
  config: ProjectMemoryConfig,
): string | undefined {
  const merged = { ...DEFAULT_CONFIG, ...config }
  if (candidate.suggested_domain) return candidate.suggested_domain
  if (merged.distillAutoRequireDomain === false) {
    return merged.distillAutoFallbackDomain ?? DEFAULT_CONFIG.distillAutoFallbackDomain!
  }
  return undefined
}

/** Filter Tier 2 candidates eligible for auto-distill. */
export function filterAutoDistillCandidates(
  candidates: readonly MemoryCandidate[],
  config: ProjectMemoryConfig,
): MemoryCandidate[] {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const factsOnly = merged.distillAutoFactsOnly !== false
  return candidates.filter(c => {
    if (factsOnly && c.kind !== 'fact') return false
    return resolveAutoDistillDomain(c, merged) !== undefined
  })
}

function skipReasonForDomain(
  config: ProjectMemoryConfig,
  domain: string,
  presetId?: string,
): string | undefined {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const approvalDomains = merged.writeApprovalDomains
  if (
    merged.distillAutoSkipApprovalDomains !== false
    && approvalDomains
    && approvalDomains.length > 0
    && approvalDomains.includes(domain)
  ) {
    return `domain ${domain} requires approval — skipped auto-write`
  }
  try {
    assertWriteAllowed(merged, domain, presetId)
  }
  catch (e) {
    if (e instanceof MemoryError) return `${e.code}: ${e.message}`
    throw e
  }
  return undefined
}

/**
 * Promote eligible heuristic candidates to rememberEntry.
 * @param cwd - session cwd.
 * @param config - plugin config.
 * @param events - session log snapshot.
 * @param source - provenance from current agent/session.
 * @param trigger - hook that fired.
 * @param agent - owning agent for per-session limits.
 */
export async function runAutoDistill(
  cwd: string,
  config: ProjectMemoryConfig,
  events: readonly SessionLogEvent[],
  source: RememberSource,
  trigger: AutoDistillTrigger,
  agent: Agent,
): Promise<AutoDistillResult> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const maxWrites = merged.distillAutoMaxWrites ?? DEFAULT_CONFIG.distillAutoMaxWrites!
  const maxBytes = merged.distillAssistMaxBytes ?? DEFAULT_CONFIG.distillAssistMaxBytes!
  const state = sessionState(agent)

  const status = await memoryStatus(cwd, merged)
  const domainIds = status.domains.map(d => d.id)
  const suggested = suggestMemoryCandidates(events, domainIds, { max_candidates: 10 }, maxBytes)
  const eligible = filterAutoDistillCandidates(suggested.candidates, merged)

  const written: AutoDistillWritten[] = []
  const skipped: AutoDistillSkipped[] = []

  for (const candidate of eligible) {
    if (state.writeCount >= maxWrites) {
      skipped.push({ summary_hint: candidate.summary_hint, reason: 'session auto-write limit reached' })
      continue
    }

    const digest = hintDigest(candidate.summary_hint)
    if (state.hintDigests.has(digest)) {
      skipped.push({ summary_hint: candidate.summary_hint, reason: 'duplicate hint this session' })
      continue
    }

    const domain = resolveAutoDistillDomain(candidate, merged)!
    const denyReason = skipReasonForDomain(merged, domain, source.preset_id)
    if (denyReason) {
      skipped.push({ summary_hint: candidate.summary_hint, reason: denyReason })
      continue
    }

    try {
      const result = await rememberEntry(cwd, merged, {
        kind: 'fact',
        domain,
        summary: candidate.summary_hint,
        body: candidate.excerpt,
        confidence: 'low',
        tags: ['auto-distill'],
      }, source)
      written.push({ id: result.id, domain: result.domain, summary: candidate.summary_hint })
      state.writeCount++
      state.hintDigests.add(digest)
    }
    catch (e) {
      const reason = e instanceof MemoryError
        ? `${e.code}: ${e.message}`
        : String(e)
      skipped.push({ summary_hint: candidate.summary_hint, reason })
    }
  }

  return { kind: 'auto-distill-result', trigger, written, skipped }
}

/**
 * Build bounded inject summarizing auto-distill outcome for the session log.
 * @param result - auto-distill run outcome.
 * @param maxBytes - UTF-8 budget.
 */
export function formatAutoDistillInject(
  result: AutoDistillResult,
  maxBytes: number,
): { text: string; digest: string } {
  const lines: string[] = []
  if (result.written.length > 0) {
    lines.push(`Auto-distilled ${result.written.length} fact(s) to project memory:`)
    for (const w of result.written) {
      lines.push(`- [${w.domain}] ${w.summary} (id: ${w.id})`)
    }
  }
  else {
    lines.push('Auto-distill ran — no facts written.')
  }
  if (result.skipped.length > 0) {
    lines.push(`Skipped ${result.skipped.length} candidate(s) (ACL, approval domain, limit, or duplicate).`)
  }
  lines.push('Review with `recall`; use `remember(supersedes: ...)` to correct.')

  const bounded = truncateUtf8(lines.join('\n'), maxBytes)
  const text = `<system-reminder>\n${bounded}\n</system-reminder>`
  return { text, digest: digestContent(`${AUTO_DISTILL_KIND}:${bounded}`) }
}

/** Typed source marker for auto-distill inject. */
export function projectMemoryAutoDistillSource(
  digest: string,
  trigger: AutoDistillTrigger,
  writtenCount: number,
): {
  kind: 'project-memory'
  version: 1
  action: 'auto-distill'
  digest: string
  trigger: AutoDistillTrigger
  written_count: number
} {
  return {
    kind: 'project-memory',
    version: 1,
    action: 'auto-distill',
    digest,
    trigger,
    written_count: writtenCount,
  }
}

function sessionCwd(agent: Agent): string {
  return agent.session.header.cwd ?? process.cwd()
}

function rememberSource(agent: Agent): RememberSource {
  return {
    session_id: String(agent.id),
    preset_id: agent.session.header.agentPreset,
  }
}

/**
 * Install Tier 3 auto-distill hooks. Default off.
 * @param ctx - Cordis context.
 * @param config - plugin config.
 */
export function installAutoDistill(ctx: Context, config: ProjectMemoryConfig): void {
  const merged: ProjectMemoryConfig = { ...DEFAULT_CONFIG, ...config }
  if (!merged.distillAuto || merged.readOnly) return

  const trigger = merged.distillAutoTrigger ?? DEFAULT_CONFIG.distillAutoTrigger!
  const maxBytes = merged.distillReminderMaxBytes ?? DEFAULT_CONFIG.distillReminderMaxBytes!

  if (trigger === 'turn-stopping') {
    const minTurn = merged.distillReminderMinTurn ?? DEFAULT_CONFIG.distillReminderMinTurn!
    ctx.on('agent/turn-stopping', async (payload) => {
      if (payload.turn < minTurn || payload.signal.aborted) return
      const events = payload.agent.session.events as unknown as SessionLogEvent[]
      const result = await runAutoDistill(
        sessionCwd(payload.agent),
        merged,
        events,
        { ...rememberSource(payload.agent), turn: payload.turn },
        'turn-stopping',
        payload.agent,
      )
      if (result.written.length === 0 && result.skipped.length === 0) return
      const inject = formatAutoDistillInject(result, maxBytes)
      payload.agent.inject({
        content: [{ type: 'text', text: inject.text }],
        source: projectMemoryAutoDistillSource(inject.digest, 'turn-stopping', result.written.length),
      } as never)
    })
    return
  }

  ctx.on('session/event', async (session, event) => {
    const logEvent = event as SessionLogEvent
    if (logEvent.type !== 'compaction/end') return
    const endData = logEvent.data as { error?: unknown }
    if (endData.error !== undefined) return

    const agent = ctx.agents.get(session.id)
    if (!agent) return

    const events = session.events as unknown as SessionLogEvent[]
    findCompactionSummaryBeforeEnd(events, logEvent.seq)

    const result = await runAutoDistill(
      sessionCwd(agent),
      merged,
      events,
      rememberSource(agent),
      'compaction-end',
      agent,
    )
    if (result.written.length === 0 && result.skipped.length === 0) return
    const inject = formatAutoDistillInject(result, maxBytes)
    agent.inject({
      content: [{ type: 'text', text: inject.text }],
      source: projectMemoryAutoDistillSource(inject.digest, 'compaction-end', result.written.length),
    } as never)
  })
}
