/**
 * Cordis plugin entry — requires DeepSeek Harness peer dependencies.
 * @module dsh-tool-project-memory
 */

import type { Context } from '@deepseek-ai/cordis'
import { installAutoDistill } from './auto-distill.ts'
import { installDistillCompactionReminder, installDistillReminder } from './distill-reminder.ts'
import { installMemoryLlmBridge } from './plugin-llm-bridge.ts'
import { installIndexInject, registerMemoryTools } from './tools.ts'
import { installRememberApprovalGate } from './write-approval-gate.ts'
import type { ProjectMemoryConfig } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'

export const name = 'dsh-tool-project-memory'
export const inject = ['tools', 'agents'] as const

export type Config = ProjectMemoryConfig

/**
 * Register recall, remember, memory_status and blank-session index inject.
 * @param ctx - Cordis plugin context.
 * @param config - deployment configuration.
 */
export function apply(ctx: Context, config: Config): void {
  const merged: ProjectMemoryConfig = { ...DEFAULT_CONFIG, ...config }
  if (merged.indexInjectMaxBytes <= 0) {
    throw new Error('indexInjectMaxBytes must be a positive integer')
  }
  if (merged.recallMaxBytes <= 0 || merged.rememberMaxBodyBytes <= 0) {
    throw new Error('recallMaxBytes and rememberMaxBodyBytes must be positive integers')
  }
  if ((merged.distillReminderMaxBytes ?? DEFAULT_CONFIG.distillReminderMaxBytes!) <= 0
    || (merged.distillReminderMinTurn ?? DEFAULT_CONFIG.distillReminderMinTurn!) < 1) {
    throw new Error('distillReminderMaxBytes must be positive and distillReminderMinTurn >= 1')
  }
  if ((merged.distillAssistMaxBytes ?? DEFAULT_CONFIG.distillAssistMaxBytes!) <= 0) {
    throw new Error('distillAssistMaxBytes must be a positive integer')
  }
  const autoMax = merged.distillAutoMaxWrites ?? DEFAULT_CONFIG.distillAutoMaxWrites!
  if (autoMax < 1 || autoMax > 10) {
    throw new Error('distillAutoMaxWrites must be between 1 and 10')
  }
  const llmMax = merged.memoryLlmMaxTokens ?? DEFAULT_CONFIG.memoryLlmMaxTokens!
  const llmTimeout = merged.memoryLlmTimeoutMs ?? DEFAULT_CONFIG.memoryLlmTimeoutMs!
  if (llmMax < 64 || llmMax > 4096) {
    throw new Error('memoryLlmMaxTokens must be between 64 and 4096')
  }
  if (llmTimeout < 1000 || llmTimeout > 120_000) {
    throw new Error('memoryLlmTimeoutMs must be between 1000 and 120000')
  }
  const needsMemoryLlm = merged.distillAutoLlm
    || merged.vectorEmbedModel === 'llm-keywords-v1'
  if (needsMemoryLlm && (!merged.memoryLlmProvider || !merged.memoryLlmModel)) {
    throw new Error('memoryLlmProvider and memoryLlmModel are required when distillAutoLlm or vectorEmbedModel=llm-keywords-v1')
  }
  const dims = merged.vectorDimensions ?? DEFAULT_CONFIG.vectorDimensions!
  if (dims < 32 || dims > 4096) {
    throw new Error('vectorDimensions must be between 32 and 4096')
  }
  registerMemoryTools(ctx, merged)
  installIndexInject(ctx, merged)
  installDistillReminder(ctx, merged)
  installDistillCompactionReminder(ctx, merged)
  installRememberApprovalGate(ctx, merged)
  installMemoryLlmBridge(ctx, merged)
  installAutoDistill(ctx, merged)
}
