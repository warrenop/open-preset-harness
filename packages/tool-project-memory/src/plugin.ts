/**
 * Cordis plugin entry — requires DeepSeek Harness peer dependencies.
 * @module dsh-tool-project-memory
 */

import type { Context } from '@deepseek-ai/cordis'
import { installDistillReminder } from './distill-reminder.ts'
import { installIndexInject, registerMemoryTools } from './tools.ts'
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
  registerMemoryTools(ctx, merged)
  installIndexInject(ctx, merged)
  installDistillReminder(ctx, merged)
}
