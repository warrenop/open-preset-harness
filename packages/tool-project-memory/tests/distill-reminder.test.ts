import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  prepareDistillReminder,
  projectMemoryDistillReminderSource,
} from '../src/distill-reminder.ts'
import { rememberEntry } from '../src/remember.ts'

async function makeProject(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'oph-distill-'))
  await mkdir(join(root, '.git'))
  return {
    root,
    cleanup: async () => {
      const { rm } = await import('node:fs/promises')
      await rm(root, { recursive: true, force: true })
    },
  }
}

describe('distill reminder', () => {
  let cleanup: (() => Promise<void>) | undefined

  afterEach(async () => {
    await cleanup?.()
    cleanup = undefined
  })

  it('builds bounded reminder with domain hint when memory initialized', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = {
      indexInjectMaxBytes: 4096,
      recallMaxBytes: 32768,
      rememberMaxBodyBytes: 16384,
      maxDomains: 64,
      distillReminderMaxBytes: 2048,
    }

    await rememberEntry(root, config, {
      kind: 'fact',
      domain: 'security',
      summary: 'Admin routes require step-up MFA since audit',
      body: 'Applies to /admin/*.',
    }, { session_id: 'sess-1' })

    const payload = await prepareDistillReminder(root, config)
    expect(payload.text).toContain('<system-reminder>')
    expect(payload.text).toContain('remember')
    expect(payload.text).toContain('Known domains: security')
    expect(Buffer.byteLength(payload.text, 'utf8')).toBeLessThanOrEqual(2048 + 64)
    expect(payload.digest).toMatch(/^[a-f0-9]{40}$/)
  })

  it('omits domain hint when memory not initialized', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = {
      indexInjectMaxBytes: 4096,
      recallMaxBytes: 32768,
      rememberMaxBodyBytes: 16384,
      maxDomains: 64,
    }

    const payload = await prepareDistillReminder(root, config)
    expect(payload.text).not.toContain('Known domains:')
    expect(payload.text).toContain('memory_status')
  })

  it('truncates reminder to distillReminderMaxBytes', async () => {
    const { root, cleanup: c } = await makeProject()
    cleanup = c
    const config = {
      indexInjectMaxBytes: 4096,
      recallMaxBytes: 32768,
      rememberMaxBodyBytes: 16384,
      maxDomains: 64,
      distillReminderMaxBytes: 120,
    }

    const payload = await prepareDistillReminder(root, config)
    expect(Buffer.byteLength(payload.text, 'utf8')).toBeLessThanOrEqual(120 + 48)
  })

  it('exports typed distill-reminder source marker', () => {
    const source = projectMemoryDistillReminderSource('abc123')
    expect(source).toEqual({
      kind: 'project-memory',
      version: 1,
      action: 'distill-reminder',
      digest: 'abc123',
    })
  })
})
