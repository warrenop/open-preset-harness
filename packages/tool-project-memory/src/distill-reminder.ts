import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { digestContent } from './frontmatter.ts'
import { memoryStatus } from './recall.ts'
import type { ProjectMemoryConfig } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { truncateUtf8 } from './validate.ts'

const DISTILL_REMINDER_KIND = 'distill-reminder-v1'

/** Result of preparing a turn-end distill reminder inject. */
export interface DistillReminderPayload {
  readonly text: string
  readonly digest: string
}

/** Per-agent session dedupe — at most one distill reminder per session. */
const injectedDistillReminder = new WeakMap<Agent, string>()

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
  const status = await memoryStatus(cwd, merged)

  const domainHint = status.initialized && status.domains.length > 0
    ? `\nKnown domains: ${status.domains.map(d => d.id).join(', ')} — call \`memory_status\` for counts.`
    : ''

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

/** Typed source marker for distill reminder inject. */
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
