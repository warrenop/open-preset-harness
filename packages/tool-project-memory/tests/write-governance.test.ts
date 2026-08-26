import { describe, expect, it } from 'vitest'
import { assertWriteAllowed, evaluateRememberPreExecute } from '../src/write-governance.ts'
import { DEFAULT_CONFIG, MemoryError } from '../src/types.ts'

describe('write governance', () => {
  const base = { ...DEFAULT_CONFIG }

  it('allows write when no ACL configured', () => {
    expect(() => assertWriteAllowed(base, 'api', 'code')).not.toThrow()
  })

  it('denies readOnly', () => {
    expect(() => assertWriteAllowed({ ...base, readOnly: true }, 'api', 'code'))
      .toThrow(new MemoryError('MEMORY_READ_ONLY', 'project memory is read-only'))
  })

  it('denies writeDenyDomains', () => {
    expect(() => assertWriteAllowed({ ...base, writeDenyDomains: ['client'] }, 'client', 'code'))
      .toThrow(new MemoryError('DOMAIN_WRITE_DENIED', 'writes denied for domain client'))
  })

  it('enforces writeAllowDomains whitelist', () => {
    expect(() => assertWriteAllowed(
      { ...base, writeAllowDomains: ['security', 'api'] },
      'client',
      'code',
    )).toThrow(new MemoryError('DOMAIN_WRITE_NOT_ALLOWED', 'domain client is not in writeAllowDomains'))
  })

  it('denies writeDenyPresets', () => {
    expect(() => assertWriteAllowed({ ...base, writeDenyPresets: ['translator'] }, 'api', 'translator'))
      .toThrow(new MemoryError('PRESET_WRITE_DENIED', 'writes denied for preset translator'))
  })

  it('enforces writeAllowPresets whitelist', () => {
    const cfg = { ...base, writeAllowPresets: ['security-review'] }
    expect(() => assertWriteAllowed(cfg, 'security', 'code'))
      .toThrow(new MemoryError('PRESET_WRITE_DENIED', 'preset code is not in writeAllowPresets'))
    expect(() => assertWriteAllowed(cfg, 'security', undefined))
      .toThrow(new MemoryError('PRESET_WRITE_DENIED', 'writes require a preset listed in writeAllowPresets'))
    expect(() => assertWriteAllowed(cfg, 'security', 'security-review')).not.toThrow()
  })

  it('checks deny before allow lists', () => {
    expect(() => assertWriteAllowed({
      ...base,
      writeDenyDomains: ['security'],
      writeAllowDomains: ['security'],
    }, 'security', 'security-review')).toThrow(new MemoryError('DOMAIN_WRITE_DENIED', 'writes denied for domain security'))
  })
})

describe('remember pre-execute (Phase 3b)', () => {
  const base = { ...DEFAULT_CONFIG }

  it('allows when writeApprovalDomains is empty', () => {
    expect(evaluateRememberPreExecute(base, 'security', 'code')).toEqual({ kind: 'allow' })
  })

  it('asks for configured approval domains after ACL passes', () => {
    const cfg = { ...base, writeApprovalDomains: ['security', 'client'] }
    expect(evaluateRememberPreExecute(cfg, 'security', 'code')).toEqual({
      kind: 'ask',
      reason: 'remember to domain "security" requires human approval',
    })
    expect(evaluateRememberPreExecute(cfg, 'api', 'code')).toEqual({ kind: 'allow' })
  })

  it('denies ACL failures before approval ask', () => {
    const cfg = {
      ...base,
      writeApprovalDomains: ['client'],
      writeDenyDomains: ['client'],
    }
    expect(evaluateRememberPreExecute(cfg, 'client', 'code')).toEqual({
      kind: 'deny',
      reason: 'DOMAIN_WRITE_DENIED: writes denied for domain client',
      code: 'DOMAIN_WRITE_DENIED',
    })
  })
})
