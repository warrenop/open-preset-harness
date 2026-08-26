import type { Agent } from '@deepseek-ai/dsh-agent'
import type { MemoryCandidate } from './suggest-memory-candidates.ts'
import type { ProjectMemoryConfig } from './types.ts'

/** Optional LLM refiner for Tier 3 auto-distill candidates. */
export type AutoDistillRefiner = (
  candidates: readonly MemoryCandidate[],
  agent: Agent,
) => Promise<readonly MemoryCandidate[]>

let refiner: AutoDistillRefiner | undefined

/** Register auto-distill LLM refiner (plugin only). */
export function setAutoDistillRefiner(fn: AutoDistillRefiner | undefined): void {
  refiner = fn
}

/**
 * Apply registered LLM refiner when distillAutoLlm is enabled.
 * @param candidates - heuristic candidates after filter.
 * @param config - plugin config.
 * @param agent - owning agent.
 */
export async function refineAutoDistillCandidates(
  candidates: readonly MemoryCandidate[],
  config: ProjectMemoryConfig,
  agent: Agent,
): Promise<readonly MemoryCandidate[]> {
  if (!config.distillAutoLlm || !refiner || candidates.length === 0) return candidates
  try {
    return await refiner(candidates, agent)
  }
  catch {
    return candidates
  }
}
