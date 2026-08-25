import {
  DOMAIN_ID_PATTERN,
  RECALL_LIMIT_DEFAULT,
  RECALL_LIMIT_MAX,
  RECALL_LIMIT_MIN,
  SLUG_MAX_LEN,
  SLUG_PATTERN,
  SUMMARY_MAX,
  SUMMARY_MIN,
  TAG_PATTERN,
  MAX_TAGS,
} from './constants.ts'
import type {
  Confidence,
  DecisionStatus,
  MemoryKind,
  RememberInput,
  Sensitivity,
} from './types.ts'
import { MemoryError } from './types.ts'

/** @param domain - candidate domain id. */
export function validateDomainId(domain: string): void {
  if (!DOMAIN_ID_PATTERN.test(domain)) {
    throw new MemoryError('VALIDATION_FAILED', `invalid domain id: ${JSON.stringify(domain)}`)
  }
}

/** @param slug - decision filename slug. */
export function validateSlug(slug: string): void {
  if (slug.length > SLUG_MAX_LEN || !SLUG_PATTERN.test(slug)) {
    throw new MemoryError('VALIDATION_FAILED', `invalid decision_slug: ${JSON.stringify(slug)}`)
  }
}

/**
 * Validate remember input before write.
 * @param input - tool args.
 * @param rememberMaxBodyBytes - config limit.
 */
export function validateRememberInput(input: RememberInput, rememberMaxBodyBytes: number): void {
  validateDomainId(input.domain)
  const summary = input.summary.trim()
  if (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX) {
    throw new MemoryError(
      'VALIDATION_FAILED',
      `summary length must be ${SUMMARY_MIN}–${SUMMARY_MAX} characters`,
    )
  }
  const bodyBytes = Buffer.byteLength(input.body, 'utf8')
  if (bodyBytes > rememberMaxBodyBytes) {
    throw new MemoryError(
      'VALIDATION_FAILED',
      `body exceeds rememberMaxBodyBytes (${rememberMaxBodyBytes})`,
    )
  }
  if (input.kind === 'decision') {
    if (!input.decision_status) {
      throw new MemoryError('VALIDATION_FAILED', 'decision_status required when kind=decision')
    }
    validateDecisionStatus(input.decision_status)
    if (!input.decision_slug) {
      throw new MemoryError('VALIDATION_FAILED', 'decision_slug required when kind=decision')
    }
    validateSlug(input.decision_slug)
  }
  if (input.confidence) validateConfidence(input.confidence)
  if (input.sensitivity) validateSensitivity(input.sensitivity)
  if (input.tags) {
    if (input.tags.length > MAX_TAGS) {
      throw new MemoryError('VALIDATION_FAILED', `at most ${MAX_TAGS} tags`)
    }
    for (const tag of input.tags) {
      if (!TAG_PATTERN.test(tag)) {
        throw new MemoryError('VALIDATION_FAILED', `invalid tag: ${JSON.stringify(tag)}`)
      }
    }
  }
  if (input.supersedes && !/^mem-\d{8}-[a-f0-9]{6}$/.test(input.supersedes)) {
    throw new MemoryError('VALIDATION_FAILED', `invalid supersedes id: ${JSON.stringify(input.supersedes)}`)
  }
  if (input.expires_at !== undefined) {
    validateExpiresAt(input.expires_at)
  }
}

/** @param kind - memory kind. */
export function validateKind(kind: string): asserts kind is MemoryKind {
  if (kind !== 'fact' && kind !== 'decision') {
    throw new MemoryError('VALIDATION_FAILED', `kind must be fact or decision`)
  }
}

function validateConfidence(c: string): asserts c is Confidence {
  if (c !== 'low' && c !== 'medium' && c !== 'high') {
    throw new MemoryError('VALIDATION_FAILED', 'invalid confidence')
  }
}

function validateSensitivity(s: string): asserts s is Sensitivity {
  if (s !== 'public' && s !== 'internal' && s !== 'restricted') {
    throw new MemoryError('VALIDATION_FAILED', 'invalid sensitivity')
  }
}

function validateDecisionStatus(s: string): asserts s is DecisionStatus {
  if (s !== 'proposed' && s !== 'accepted' && s !== 'deprecated') {
    throw new MemoryError('VALIDATION_FAILED', 'invalid decision_status')
  }
}

/** @param expiresAt - ISO 8601 timestamp for optional entry expiry. */
export function validateExpiresAt(expiresAt: string): void {
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) {
    throw new MemoryError('VALIDATION_FAILED', `invalid expires_at: ${JSON.stringify(expiresAt)}`)
  }
}

/**
 * Clamp recall limit to configured bounds.
 * @param limit - optional model-supplied limit.
 */
export function normalizeRecallLimit(limit?: number): number {
  if (limit === undefined) return RECALL_LIMIT_DEFAULT
  if (!Number.isInteger(limit) || limit < RECALL_LIMIT_MIN || limit > RECALL_LIMIT_MAX) {
    throw new MemoryError(
      'VALIDATION_FAILED',
      `limit must be integer ${RECALL_LIMIT_MIN}–${RECALL_LIMIT_MAX}`,
    )
  }
  return limit
}

/**
 * Score entry against query (higher = better).
 * @param query - lowercased query.
 * @param summary - entry summary.
 * @param tags - entry tags.
 * @param body - entry body.
 */
export function scoreEntry(
  query: string,
  summary: string,
  tags: readonly string[],
  body: string,
): number {
  const q = query.toLowerCase()
  let score = 0
  const s = summary.toLowerCase()
  const b = body.toLowerCase()
  if (s.includes(q)) score += 3
  if (tags.some(t => t.toLowerCase().includes(q))) score += 2
  if (b.includes(q)) score += 1
  return score
}

/**
 * Truncate UTF-8 string to max bytes.
 * @param text - input.
 * @param maxBytes - budget.
 */
export function truncateUtf8(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (Buffer.byteLength(text.slice(0, mid), 'utf8') <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo)
}

/**
 * Whether a memory entry's optional expires_at is in the past.
 * @param expiresAt - ISO 8601 timestamp from frontmatter.
 * @param now - comparison instant (defaults to current time).
 */
export function isEntryExpired(expiresAt: string | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return false
  return t < now.getTime()
}
