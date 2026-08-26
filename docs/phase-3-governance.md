# Phase 3: Domain write governance

**Status:** Implemented (Tier 3a v0.6.0 · Tier 3b v0.8.0) · **Tracking:** [#8](https://github.com/warrenop/open-preset-harness/issues/8) [#10](https://github.com/warrenop/open-preset-harness/issues/10) · **Builds on:** [phase-0-memory-api.md](phase-0-memory-api.md)  
English | [中文](#中文)

Extend Phase 0 soft gates (`readOnly`, `writeDenyDomains`) with **preset- and domain-level ACL** (Tier 3a) and **Harness approval** for sensitive domains (Tier 3b).

**Out of scope:** sensitivity-based auto-approval, cross-project federation, auto-write on approval.

---

## 1. Problem

All presets with `remember` can write any domain. Teams need to restrict e.g. `security` / `client` to specific presets (SRE, lead) while others stay read-only for writes — and sometimes require a human to approve writes to high-risk domains.

Phase 0 only supports global read-only and a deny list.

---

## 2. Tiers

| Tier | Name | Behavior | Ship target |
|------|------|----------|-------------|
| **3a** | Config ACL | Allow/deny lists for domains and presets | **v0.6.0** |
| **3b** | Approval gate | Harness `ctx.approval` before `remember` on listed domains | **v0.8.0** |

---

## 3. Locked decisions (Tier 3a)

| Topic | Decision |
|-------|----------|
| Enforcement | `rememberEntry` only — recall unchanged |
| Deny wins | `writeDenyDomains` / `writeDenyPresets` checked before allow lists |
| Domain whitelist | `writeAllowDomains` non-empty → only listed domains writable |
| Preset whitelist | `writeAllowPresets` non-empty → only listed presets writable |
| Preset deny | `writeDenyPresets` blocks named presets |
| Missing preset | When `writeAllowPresets` is set and `preset_id` absent → deny |
| Errors | `DOMAIN_WRITE_DENIED`, `DOMAIN_WRITE_NOT_ALLOWED`, `PRESET_WRITE_DENIED` |

---

## 4. Config (Tier 3a)

```ts
writeAllowDomains?: string[]   // default: [] (no whitelist)
writeDenyPresets?: string[]    // default: []
writeAllowPresets?: string[]   // default: [] (no whitelist)
```

Example — only `security-review` preset may write `security`:

```yaml
config:
  writeAllowDomains: []
  writeAllowPresets: ['security-review']
  writeDenyDomains: ['client']
```

Example — only SRE preset writes anything:

```yaml
config:
  writeAllowPresets: ['sre-incident']
```

---

## 5. Evaluation order (Tier 3a)

1. `readOnly` → `MEMORY_READ_ONLY`
2. `writeDenyDomains` includes domain → `DOMAIN_WRITE_DENIED`
3. `writeDenyPresets` includes preset → `PRESET_WRITE_DENIED`
4. `writeAllowDomains` non-empty and domain not listed → `DOMAIN_WRITE_NOT_ALLOWED`
5. `writeAllowPresets` non-empty and preset not listed (or missing) → `PRESET_WRITE_DENIED`

---

## 6. Tier 3b — Approval gate

### Problem

Config ACL alone cannot pause for human review when a preset *may* write a sensitive domain but each write should be confirmed (e.g. `client`, `security`).

### Config

```ts
writeApprovalDomains?: string[]   // default: [] (no approval gate)
```

Example — SRE preset may write `security`, but each write prompts:

```yaml
config:
  writeAllowPresets: ['sre-incident']
  writeApprovalDomains: ['security', 'client']
```

### Behavior

| Step | Where | Outcome |
|------|-------|---------|
| 1 | `tools/pre-execute` | Run Tier 3a ACL via `evaluateRememberPreExecute` |
| 2 | ACL deny | `{ kind: 'deny' }` — tool never runs |
| 3 | Domain in `writeApprovalDomains` | `{ kind: 'ask', reason }` → Harness `ctx.approval` |
| 4 | Approval `allowed-once` | Tool executes; `rememberEntry` re-checks ACL |
| 5 | Approval rejected / unavailable | Deny (fail-closed) |
| 6 | Domain not listed | Delegate to next pre-execute listener (`allow`) |

### Locked decisions (Tier 3b)

| Topic | Decision |
|-------|----------|
| Hook | `tools/pre-execute` on tool name `remember` only |
| ACL before ask | Deny lists and whitelists run before approval |
| Approval seam | Standard Harness `PreToolDecision` `ask` — no custom UI in plugin |
| No approval service | `ask` degrades to deny (Harness default) |
| Defense in depth | `rememberEntry` still calls `assertWriteAllowed` after approval |

### Deployment note

Web profiles with `@deepseek-ai/dsh-user-approval` composed get human prompts. Headless/CI without an approval answerer should leave `writeApprovalDomains` empty or mount a machine answerer.

---

## 中文

Tier 3a：配置级 domain / preset 写入 ACL。Tier 3b：对 `writeApprovalDomains` 中的 domain，`remember` 经 Harness 审批后再写盘；ACL 拒绝优先于审批询问。

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-26 | Tier 3b approval gate (v0.8.0) |
| 2026-08-26 | Initial Phase 3 governance draft (Tier 3a for v0.6.0) |
