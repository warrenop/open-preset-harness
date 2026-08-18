---
oph-memory-schema: 1
id: mem-20260818-e3d161
kind: fact
domain: engineering
created_at: 2026-08-18T09:46:47.388Z
summary: Public API pagination uses opaque cursors only
confidence: medium
tags: []
sensitivity: internal
source:
  session_id: session-d466f151-0339-42df-a1cf-996876957928
---

Public API pagination endpoints must use opaque cursors only — no offset-based pagination — to avoid pagination drift and ensure stable result ordering across concurrent writes.


<!-- oph-memory-entry -->
