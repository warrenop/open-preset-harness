# Phase 3: Domain write governance

**Status:** Implemented (Tier 3a, v0.6.0) · **Tracking:** [#8](https://github.com/warrenop/open-preset-harness/issues/8) · **Builds on:** [phase-0-memory-api.md](phase-0-memory-api.md)  
English | [中文](#中文)

Extend Phase 0 soft gates (`readOnly`, `writeDenyDomains`) with **preset- and domain-level ACL** — still config-driven, no Harness approval UI in Tier 3a.

**Out of scope (Tier 3a):** interactive approval workflows, sensitivity-based auto-approval, cross-project federation.

---

## 1. Problem

All presets with `remember` can write any domain. Teams need to restrict e.g. `security` / `client` to specific presets (SRE, lead) while others stay read-only for writes.

Phase 0 only supports global read-only and a deny list.

---

## 2. Tiers

| Tier | Name | Behavior | Ship target |
|------|------|----------|-------------|
| **3a** | Config ACL | Allow/deny lists for domains and presets | **v0.6.0** |
| **3b** | Approval gate | Harness approval before `remember` on restricted domains | Deferred |

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

## 4. Config

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

## 5. Evaluation order

1. `readOnly` → `MEMORY_READ_ONLY`
2. `writeDenyDomains` includes domain → `DOMAIN_WRITE_DENIED`
3. `writeDenyPresets` includes preset → `PRESET_WRITE_DENIED`
4. `writeAllowDomains` non-empty and domain not listed → `DOMAIN_WRITE_NOT_ALLOWED`
5. `writeAllowPresets` non-empty and preset not listed (or missing) → `PRESET_WRITE_DENIED`

---

## 中文

Tier 3a：配置级 domain / preset 写入 ACL，在 `remember` 时校验。审批流（3b）后续再做。

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-26 | Initial Phase 3 governance draft (Tier 3a for v0.6.0) |
