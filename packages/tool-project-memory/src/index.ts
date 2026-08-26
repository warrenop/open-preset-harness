/**
 * Core exports — no DeepSeek Harness peer dependencies required.
 * @module dsh-tool-project-memory/core
 */

export type {
  ProjectMemoryConfig,
  RecallInput,
  RecallOutput,
  RememberInput,
  RememberOutput,
  MemoryStatusOutput,
  MemoryEntry,
  MemoryErrorCode,
} from './types.ts'
export type {
  MemoryCandidate,
  SuggestMemoryCandidatesInput,
  SuggestMemoryCandidatesOutput,
} from './suggest-memory-candidates.ts'
export { DEFAULT_CONFIG, MemoryError, OPH_MEMORY_SCHEMA } from './types.ts'
export { recallEntries, memoryStatus } from './recall.ts'
export { rememberEntry, isMemoryInitialized } from './remember.ts'
export { prepareIndexInject, projectMemoryIndexSource } from './inject-index.ts'
export type { IndexInjectPayload } from './inject-index.ts'
export {
  prepareDistillReminder,
  prepareDistillCompactionReminder,
  findCompactionSummaryBeforeEnd,
  projectMemoryDistillReminderSource,
  projectMemoryDistillCompactionReminderSource,
  installDistillReminder,
  installDistillCompactionReminder,
} from './distill-reminder.ts'
export type { DistillReminderPayload, SessionLogEvent } from './distill-reminder.ts'
export { generateIndex } from './index-generator.ts'
export {
  suggestMemoryCandidates,
  suggestMemoryCandidatesForSession,
} from './suggest-memory-candidates.ts'
export {
  filterAutoDistillCandidates,
  formatAutoDistillInject,
  installAutoDistill,
  projectMemoryAutoDistillSource,
  resolveAutoDistillDomain,
  runAutoDistill,
} from './auto-distill.ts'
export type {
  AutoDistillResult,
  AutoDistillSkipped,
  AutoDistillTrigger,
  AutoDistillWritten,
} from './auto-distill.ts'
export { resolveMemoryPaths, resolveProjectRoot } from './project-root.ts'
export { loadAllEntries, parseDomainFile } from './memory-store.ts'
export { parseEntryFrontmatter, serializeEntryBlock, generateEntryId } from './frontmatter.ts'
export {
  tokenizeForRecall,
  buildIdfMap,
  scoreEntryRanked,
  scoreEntryLegacy,
} from './recall-ranking.ts'
export { assertWriteAllowed, evaluateRememberPreExecute } from './write-governance.ts'
export type { RememberPreExecuteDecision } from './write-governance.ts'
export {
  embedLocal,
  cosineSimilarity,
  buildVectorSidecar,
  loadVectorSidecar,
  saveVectorSidecar,
  ensureVectorSidecar,
  scoreEntryVector,
  vectorSidecarPath,
  LOCAL_EMBED_MODEL,
  OPH_VECTOR_SCHEMA,
} from './vector-sidecar.ts'
export type { VectorSidecar } from './vector-sidecar.ts'
