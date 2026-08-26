import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { digestContent } from './frontmatter.ts'
import { memoryStatus } from './recall.ts'
import type { ProjectMemoryConfig } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { truncateUtf8 } from './validate.ts'

const DISTILL_REMINDER_KIND = 'distill-reminder-v1'
const DISTILL_COMPACTION_KIND = 'distill-compaction-reminder-v1'

/** Minimal session log event for compaction bracket lookup. */
export interface SessionLogEvent {
  readonly type: string
  readonly seq: number
  readonly data: unknown
}

/** Result of preparing a turn-end distill reminder inject. */
export interface DistillReminderPayload {
  readonly text: string
  readonly digest: string
}

/** Per-agent session dedupe — at most one turn-end distill reminder per session. */
const injectedDistillReminder = new WeakMap<Agent, string>()

/**
 * Find compaction/summary text in the bracket ending at compaction/end.
 * @param events - session log snapshot.
 * @param endSeq - seq of compaction/end.
 */
export function findCompactionSummaryBeforeEnd(
  events: readonly SessionLogEvent[],
  endSeq: number,
): string | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!
    if (event.seq >= endSeq) continue
    if (event.type === 'compaction/summary') {
      const summary = (event.data as { summary?: unknown }).summary
      return typeof summary === 'string' && summary.length > 0 ? summary : undefined
    }
    if (event.type === 'compaction/start') break
  }
  return undefined
}

async function domainHintLine(cwd: string, config: ProjectMemoryConfig): Promise<string> {
  const status = await memoryStatus(cwd, config)
  return status.initialized && status.domains.length > 0
    ? `\nKnown domains: ${status.domains.map(d => d.id).join(', ')} — call \`memory_status\` for counts.`
    : ''
}

/**
 * Build bounded turn-end reminder text suggesting explicit remember calls.
 * @param cwd - session cwd.
 * @param config - plugin config.
 */
export async function prepareDistillReminder(
  cwd: string,
  config: ProjectMemoryConfig,
): Promise<DistillReminderPayload> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const maxBytes = merged.distillReminderMaxBytes ?? DEFAULT_CONFIG.distillReminderMaxBytes!
  const domainHint = await domainHintLine(cwd, merged)

  const body = `If this session produced durable project learnings (conventions, decisions, client prefs, incident facts),
call \`remember\` with one fact per domain — not raw chat logs.
Use \`memory_status\` to see domains; use \`recall\` before overwriting related facts.${domainHint}`

  const bounded = truncateUtf8(body.trim(), maxBytes)
  const text = `<system-reminder>
${bounded}
</system-reminder>`

  return {
    text,
    digest: digestContent(`${DISTILL_REMINDER_KIND}:${bounded}`),
  }
}

/**
 * Build bounded post-compaction reminder text.
 * @param cwd - session cwd.
 * @param config - plugin config.
 * @param compactionSummary - optional summary from compaction/summary event.
 */
export async function prepareDistillCompactionReminder(
  cwd: string,
  config: ProjectMemoryConfig,
  compactionSummary?: string,
): Promise<DistillReminderPayload> {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const maxBytes = merged.distillReminderMaxBytes ?? DEFAULT_CONFIG.distillReminderMaxBytes!
  const domainHint = await domainHintLine(cwd, merged)

  const summaryHint = compactionSummary
    ? `\nCompaction summary (distill durable facts — do not paste this summary verbatim):\n${compactionSummary}`
    : '\nSession context was compacted — distill durable facts before they are harder to recover.'

  const body = `Project memory compaction just finished.${summaryHint}
Call \`remember\` for conventions, decisions, client prefs, or incident facts worth keeping.
Use \`recall\` before overwriting related entries.${domainHint}`

  const bounded = truncateUtf8(body.trim(), maxBytes)
  const text = `<system-reminder>
${bounded}
</system-reminder>`

  return {
    text,
    digest: digestContent(`${DISTILL_COMPACTION_KIND}:${bounded}`),
  }
}

/** Typed source marker for turn-end distill reminder inject. */
export function projectMemoryDistillReminderSource(digest: string): {
  kind: 'project-memory'
  version: 1
  action: 'distill-reminder'
  digest: string
} {
  return {
    kind: 'project-memory',
    version: 1,
    action: 'distill-reminder',
    digest,
  }
}

/** Typed source marker for post-compaction distill reminder inject. */
export function projectMemoryDistillCompactionReminderSource(
  digest: string,
  compactionEndSeq: number,
): {
  kind: 'project-memory'
  version: 1
  action: 'distill-compaction-reminder'
  digest: string
  compaction_end_seq: number
} {
  return {
    kind: 'project-memory',
    version: 1,
    action: 'distill-compaction-reminder',
    digest,
    compaction_end_seq: compactionEndSeq,
  }
}

/** Resolve session cwd from agent header or fallback. */
function sessionCwd(agent: Agent): string {
  return agent.session.header.cwd ?? process.cwd()
}

/**
 * Install turn-end distill reminder on agent/turn-stopping (Tier 1a).
 * Default off — injects at most once per session on eligible completed turns.
 * @param ctx - Cordis context with agents.
 * @param config - plugin config.
 */
export function installDistillReminder(ctx: Context, config: ProjectMemoryConfig): void {
  ctx.on('agent/turn-stopping', async (payload) => {
    const merged = { ...DEFAULT_CONFIG, ...config }
    const minTurn = merged.distillReminderMinTurn ?? DEFAULT_CONFIG.distillReminderMinTurn!
    if (!merged.distillReminder || merged.readOnly) return
    if (payload.turn < minTurn) return
    if (payload.signal.aborted) return
    if (injectedDistillReminder.has(payload.agent)) return

    const reminder = await prepareDistillReminder(sessionCwd(payload.agent), merged)
    if (injectedDistillReminder.get(payload.agent) === reminder.digest) return

    payload.agent.inject({
      content: [{ type: 'text', text: reminder.text }],
      source: projectMemoryDistillReminderSource(reminder.digest),
    } as never)
    injectedDistillReminder.set(payload.agent, reminder.digest)
  })
}

/**
 * Install post-compaction distill reminder on session/event (Tier 1b).
 * Default off — injects after successful compaction/end when a live agent exists.
 * @param ctx - Cordis context with agents.
 * @param config - plugin config.
 */
export function installDistillCompactionReminder(ctx: Context, config: ProjectMemoryConfig): void {
  ctx.on('session/event', async (session, event) => {
    const logEvent = event as SessionLogEvent
    if (logEvent.type !== 'compaction/end') return

    const merged = { ...DEFAULT_CONFIG, ...config }
    if (!merged.distillCompactionReminder || merged.readOnly) return

    const endData = logEvent.data as { error?: unknown }
    if (endData.error !== undefined) return

    const agent = ctx.agents.get(session.id)
    if (!agent) return

    const summary = findCompactionSummaryBeforeEnd(session.events, logEvent.seq)
    const reminder = await prepareDistillCompactionReminder(
      sessionCwd(agent),
      merged,
      summary,
    )

    agent.inject({
      content: [{ type: 'text', text: reminder.text }],
      source: projectMemoryDistillCompactionReminderSource(reminder.digest, logEvent.seq),
    } as never)
  })
}
