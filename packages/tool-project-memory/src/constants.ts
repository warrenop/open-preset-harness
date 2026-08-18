/** Validation patterns and defaults. */

export const DOMAIN_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const TAG_PATTERN = /^[a-z0-9-]+$/
export const ENTRY_ID_PATTERN = /^mem-\d{8}-[a-f0-9]{6}$/

export const SUMMARY_MIN = 10
export const SUMMARY_MAX = 240
export const MAX_TAGS = 8
export const SLUG_MAX_LEN = 48
export const RECALL_LIMIT_MIN = 1
export const RECALL_LIMIT_MAX = 20
export const RECALL_LIMIT_DEFAULT = 5

export const PROJECT_ROOT_MARKERS = ['.git'] as const

/** Must not match YAML frontmatter closing `---` lines. */
export const ENTRY_SEPARATOR = '\n\n<!-- oph-memory-entry -->\n\n'
