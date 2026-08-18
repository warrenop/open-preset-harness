---
oph-memory-schema: 1
id: mem-20260818-452afe
kind: decision
domain: security
created_at: 2026-08-18T09:46:53.267Z
summary: Admin routes require step-up MFA since audit
confidence: medium
tags: []
sensitivity: internal
source:
  session_id: session-d466f151-0339-42df-a1cf-996876957928
decision:
  status: accepted
---

Admin routes require step-up MFA (`requireStepUp`) since the security audit. Never store refresh tokens in localStorage — use httpOnly cookies or secure session storage only.
