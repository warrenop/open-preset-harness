---
oph-memory-schema: 1
id: mem-20260818-d4e5f6
kind: fact
domain: engineering
created_at: "2026-08-18T08:00:00.000Z"
summary: Public API pagination uses opaque cursors only
confidence: high
source:
  session_id: "demo-session-security"
  preset_id: "standard"
tags: [api, pagination]
sensitivity: internal
---

Do not expose offset/limit pagination on public endpoints. Use opaque cursor tokens;
document breaking cursor changes in the changelog.

<!-- oph-memory-entry -->
