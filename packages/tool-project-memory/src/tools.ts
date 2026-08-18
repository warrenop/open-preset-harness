import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { prepareIndexInject, projectMemoryIndexSource } from './inject-index.ts'
import { memoryStatus, recallEntries } from './recall.ts'
import { rememberEntry } from './remember.ts'
import type { ProjectMemoryConfig, RecallInput, RememberInput } from './types.ts'
import { MemoryError } from './types.ts'

/** Resolve session cwd from agent header or fallback. */
function sessionCwd(agent: Agent): string {
  return agent.session.header.cwd ?? process.cwd()
}

/** Build remember source from agent. */
function rememberSource(agent: Agent): {
  session_id: string
  preset_id?: string
  turn?: number
} {
  return {
    session_id: String(agent.id),
    preset_id: agent.session.header.agentPreset,
  }
}

/**
 * Register recall, remember, and memory_status tools.
 * @param ctx - Cordis context with tools registry.
 * @param config - deployment config.
 */
export function registerMemoryTools(ctx: Context, config: ProjectMemoryConfig): void {
  ctx.tools.register(defineTool({
    name: 'recall',
    description:
      'Search shared project memory (distilled facts and decisions from all presets and past sessions). '
      + 'Use when you need project-specific context: conventions, decisions, client prefs, incident learnings, '
      + 'cross-team constraints. Returns cited excerpts — not a live link to other sessions.',
    parameters: {
      query: { type: 'string', description: 'Free-text search over summary, tags, and body.' },
      domain: { type: 'string', description: 'Limit to one domain id (e.g. security, api, client).' },
      kind: {
        type: 'string',
        enum: ['fact', 'decision', 'any'],
        description: 'Entry kind filter. Default: any.',
      },
      limit: { type: 'integer', description: 'Max entries 1–20. Default: 5.' },
      include_superseded: {
        type: 'boolean',
        description: 'Include entries superseded by newer ids. Default: false.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', required: true, enum: ['recall-result'] },
          query: { type: ['string', 'null'], required: true },
          domain: { type: ['string', 'null'], required: true },
          entries: {
            type: 'array',
            required: true,
            items: { type: 'object', additionalProperties: true },
          },
          omitted_count: { type: 'integer', required: true },
          truncated: { type: 'boolean', required: true },
          project_root: { type: 'string', required: true },
          memory_dir: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.entries.length === 0
          ? 'No matching project memory entries.'
          : `Recalled ${value.entries.length} project memory entr${value.entries.length === 1 ? 'y' : 'ies'}.`,
      }],
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error('recall requires an owning agent session')
      try {
        const input: RecallInput = {
          query: args.query,
          domain: args.domain,
          kind: args.kind as RecallInput['kind'],
          limit: args.limit,
          include_superseded: args.include_superseded,
        }
        return await recallEntries(sessionCwd(exec.agent), config, input)
      }
      catch (e) {
        if (e instanceof MemoryError) throw new Error(`${e.code}: ${e.message}`)
        throw e
      }
    },
    presentCall: args => ({
      card: 'generic',
      title: 'Recall project memory',
      kind: 'search',
      rawInput: args,
    }),
  }))

  ctx.tools.register(defineTool({
    name: 'remember',
    description:
      'Persist a distilled fact or decision to shared project memory for all presets. '
      + 'Write only durable, reusable project knowledge — not raw chat logs. '
      + 'Prefer one clear fact per call. Choose the correct domain.',
    parameters: {
      kind: { type: 'string', required: true, enum: ['fact', 'decision'] },
      domain: { type: 'string', required: true, description: 'Domain id, e.g. security, api, client.' },
      summary: { type: 'string', required: true, description: 'One-line distill, 10–240 characters.' },
      body: { type: 'string', required: true, description: 'Markdown body with detailed context.' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tags, max 8.',
      },
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      supersedes: { type: 'string', description: 'Entry id this replaces.' },
      sensitivity: { type: 'string', enum: ['public', 'internal', 'restricted'] },
      decision_status: {
        type: 'string',
        enum: ['proposed', 'accepted', 'deprecated'],
        description: 'Required when kind=decision.',
      },
      decision_slug: {
        type: 'string',
        description: 'Filename slug when kind=decision.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', required: true, enum: ['remember-result'] },
          id: { type: 'string', required: true },
          path: { type: 'string', required: true },
          domain: { type: 'string', required: true },
          entry_kind: { type: 'string', required: true, enum: ['fact', 'decision'] },
          created_at: { type: 'string', required: true },
          index_updated: { type: 'boolean', required: true },
          supersedes: { type: 'string' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Remembered ${value.entry_kind} ${value.id} in domain ${value.domain} (${value.path}).`,
      }],
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error('remember requires an owning agent session')
      try {
        const input: RememberInput = {
          kind: args.kind as RememberInput['kind'],
          domain: args.domain,
          summary: args.summary,
          body: args.body,
          tags: args.tags,
          confidence: args.confidence as RememberInput['confidence'],
          supersedes: args.supersedes,
          sensitivity: args.sensitivity as RememberInput['sensitivity'],
          decision_status: args.decision_status as RememberInput['decision_status'],
          decision_slug: args.decision_slug,
        }
        return await rememberEntry(
          sessionCwd(exec.agent),
          config,
          input,
          rememberSource(exec.agent),
        )
      }
      catch (e) {
        if (e instanceof MemoryError) throw new Error(`${e.code}: ${e.message}`)
        throw e
      }
    },
    presentCall: args => ({
      card: 'generic',
      title: 'Remember project fact',
      kind: 'other',
      rawInput: { domain: args.domain, kind: args.kind, summary: args.summary },
    }),
  }))

  ctx.tools.register(defineTool({
    name: 'memory_status',
    description:
      'Show whether shared project memory is initialized and list domains with entry counts.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', required: true, enum: ['memory-status'] },
          initialized: { type: 'boolean', required: true },
          project_root: { type: 'string', required: true },
          memory_dir: { type: 'string', required: true },
          entry_count: { type: 'integer', required: true },
          domain_count: { type: 'integer', required: true },
          domains: { type: 'array', required: true, items: { type: 'object', additionalProperties: true } },
          recent_decisions: { type: 'array', required: true, items: { type: 'object', additionalProperties: true } },
          schema_version: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.initialized
          ? `Project memory: ${value.entry_count} entries across ${value.domain_count} domains.`
          : 'Project memory not initialized yet.',
      }],
    },
    async execute(_args, exec) {
      if (!exec.agent) throw new Error('memory_status requires an owning agent session')
      return memoryStatus(sessionCwd(exec.agent), config)
    },
    presentCall: () => ({ card: 'generic', title: 'Project memory status', kind: 'search' }),
  }))
}

/** Track per-agent index inject to avoid duplicate baseline. */
const injectedIndexDigest = new WeakMap<Agent, string>()

/**
 * Install blank-session index inject on agent/pre-step.
 * @param ctx - Cordis context with agents.
 * @param config - plugin config.
 */
export function installIndexInject(ctx: Context, config: ProjectMemoryConfig): void {
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (payload.turn !== 1 || payload.step !== 1) return decision
    if (decision.kind !== 'enter') return decision
    if (injectedIndexDigest.has(payload.agent)) return decision

    const indexPayload = await prepareIndexInject(sessionCwd(payload.agent), config)
    if (!indexPayload) return decision

    if (injectedIndexDigest.get(payload.agent) === indexPayload.digest) return decision

    payload.agent.inject({
      content: [{ type: 'text', text: indexPayload.text }],
      source: projectMemoryIndexSource(indexPayload.digest, indexPayload.path),
    })
    injectedIndexDigest.set(payload.agent, indexPayload.digest)
    return decision
  })
}
