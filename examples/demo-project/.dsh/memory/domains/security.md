---
oph-memory-schema: 1
id: mem-20260818-a1b2c3
kind: fact
domain: security
created_at: "2026-08-18T08:00:00.000Z"
summary: Admin routes require step-up MFA since audit
confidence: high
source:
  session_id: "demo-session-security"
  preset_id: "standard"
tags: [auth, mfa, admin]
sensitivity: internal
---

All `/admin/*` routes and internal admin APIs must use the `requireStepUp` middleware.
Web clients must not store refresh tokens in localStorage — httpOnly cookies only.
This was confirmed in the 2026-08 security review.

<!-- oph-memory-entry -->
