/**
 * Optional Harness LLM bridge — opportunistic ctx.get('llm'), fail-open to heuristics.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { FinishReason, GenerateOptions } from '@deepseek-ai/dsh-llm'
import { setAutoDistillRefiner } from './auto-distill-refiner.ts'
import { setEmbedTextProvider } from './embed-text-provider.ts'
import type { MemoryCandidate } from './suggest-memory-candidates.ts'
import type { ProjectMemoryConfig } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { truncateUtf8 } from './validate.ts'

const PLUGIN_SOURCE = { kind: 'plugin' as const, plugin: 'dsh-tool-project-memory' }

interface LlmRoute {
  provider: string
  model: string
}

function finishError(finish: FinishReason): Error | undefined {
  if (finish.kind === 'stop') return undefined
  if (finish.kind === 'max-tokens') return new Error('memory-llm: output reached maxTokens')
  if (finish.kind === 'tool-calls') return new Error('memory-llm: unexpected tool call')
  return new Error(finish.kind === 'error' || finish.kind === 'aborted'
    ? finish.failure.message
    : 'memory-llm: unsupported finish reason')
}

function resolveRoute(config: ProjectMemoryConfig): LlmRoute | undefined {
  const provider = config.memoryLlmProvider
  const model = config.memoryLlmModel
  if (provider && model) return { provider, model }
  return undefined
}

async function completeText(
  ctx: Context,
  config: ProjectMemoryConfig,
  system: string,
  userText: string,
  sessionId: string,
): Promise<string | undefined> {
  const llm = ctx.get('llm') as { stream: (o: GenerateOptions) => AsyncIterable<unknown> } | undefined
  const route = resolveRoute(config)
  if (!llm || !route) return undefined

  const maxTokens = config.memoryLlmMaxTokens ?? DEFAULT_CONFIG.memoryLlmMaxTokens!
  const timeoutMs = config.memoryLlmTimeoutMs ?? DEFAULT_CONFIG.memoryLlmTimeoutMs!
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const options: GenerateOptions = {
      provider: route.provider,
      model: route.model,
      system,
      messages: [createUserMessage({
        content: [{ type: 'text', text: userText }],
        source: PLUGIN_SOURCE,
      })],
      maxTokens,
      sessionId: sessionId as GenerateOptions['sessionId'],
      signal: controller.signal,
    }
    const assembler = new BlockAssembler()
    for await (const chunk of llm.stream(options)) {
      assembler.push(chunk as never)
    }
    const err = finishError(assembler.finish)
    if (err) return undefined
    return assembler.blocks()
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim() || undefined
  }
  catch {
    return undefined
  }
  finally {
    clearTimeout(timer)
  }
}

function parseJsonArray(raw: string): unknown[] | undefined {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) return undefined
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : undefined
  }
  catch {
    return undefined
  }
}

async function refineCandidates(
  ctx: Context,
  config: ProjectMemoryConfig,
  candidates: readonly MemoryCandidate[],
  agent: Agent,
): Promise<readonly MemoryCandidate[]> {
  const payload = candidates.map((c, i) => ({
    i,
    kind: c.kind,
    summary_hint: c.summary_hint,
    suggested_domain: c.suggested_domain,
    excerpt: truncateUtf8(c.excerpt, 240),
  }))
  const system = [
    'You filter session distill candidates for shared project memory.',
    'Return ONLY a JSON array of objects: { "i": number, "accept": boolean, "domain"?: string, "summary"?: string }.',
    'Accept only durable project facts/decisions — not transient chat, tool output, or secrets.',
    'Prefer explicit domain ids when provided; omit rejected items (accept: false).',
  ].join('\n')
  const text = await completeText(
    ctx,
    config,
    system,
    JSON.stringify(payload),
    String(agent.id),
  )
  if (!text) return candidates

  const decisions = parseJsonArray(text)
  if (!decisions) return candidates

  const accepted = new Map<number, { domain?: string; summary?: string }>()
  for (const row of decisions) {
    if (typeof row !== 'object' || row === null) continue
    const rec = row as { i?: unknown; accept?: unknown; domain?: unknown; summary?: unknown }
    if (typeof rec.i !== 'number' || rec.accept !== true) continue
    accepted.set(rec.i, {
      domain: typeof rec.domain === 'string' ? rec.domain : undefined,
      summary: typeof rec.summary === 'string' ? rec.summary : undefined,
    })
  }
  if (accepted.size === 0) return []

  return candidates.flatMap((c, i) => {
    const pick = accepted.get(i)
    if (!pick) return []
    return [{
      ...c,
      kind: c.kind === 'unknown' ? 'fact' as const : c.kind,
      suggested_domain: pick.domain ?? c.suggested_domain,
      summary_hint: pick.summary ? truncateUtf8(pick.summary.replace(/\s+/g, ' ').trim(), 240) : c.summary_hint,
    }]
  })
}

async function keywordsForEmbed(
  ctx: Context,
  config: ProjectMemoryConfig,
  text: string,
): Promise<string> {
  const system = [
    'Extract 5-12 search keywords for project memory retrieval from the text.',
    'Return ONLY a JSON array of lowercase keyword strings — no prose.',
  ].join('\n')
  const raw = await completeText(ctx, config, system, truncateUtf8(text, 1200), 'memory-embed')
  if (!raw) return text
  const arr = parseJsonArray(raw)
  if (!arr) return text
  const keywords = arr.filter((k): k is string => typeof k === 'string' && k.length >= 2)
  if (keywords.length === 0) return text
  return `${keywords.join(' ')}\n${truncateUtf8(text, 400)}`
}

/**
 * Wire optional LLM refiner and embed keyword enhancer when configured.
 * @param ctx - Cordis context.
 * @param config - merged plugin config.
 */
export function installMemoryLlmBridge(ctx: Context, config: ProjectMemoryConfig): void {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const route = resolveRoute(merged)
  const needsLlm = merged.distillAutoLlm
    || merged.vectorEmbedModel === 'llm-keywords-v1'
  if (!needsLlm) return

  if (!route) {
    throw new Error('memoryLlmProvider and memoryLlmModel are required when distillAutoLlm or vectorEmbedModel=llm-keywords-v1')
  }

  if (merged.distillAutoLlm) {
    setAutoDistillRefiner((candidates, agent) => refineCandidates(ctx, merged, candidates, agent))
  }

  if (merged.vectorEmbedModel === 'llm-keywords-v1') {
    setEmbedTextProvider(text => keywordsForEmbed(ctx, merged, text))
  }
}

/** Clear LLM hooks on plugin dispose (test hygiene). */
export function clearMemoryLlmBridge(): void {
  setAutoDistillRefiner(undefined)
  setEmbedTextProvider(undefined)
}
