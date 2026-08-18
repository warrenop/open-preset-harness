# Dual-preset demo walkthrough

English | [中文](demo-walkthrough.zh.md)

**Goal:** Preset A writes shared project memory; Preset B (new session) reads it — without repeating work or burning tokens rediscovering facts.

**Time:** ~10 minutes live · ~3 minutes on video

**Prerequisites:** [Harness integration](harness-integration.md) complete.

---

## Cast

| Role | Harness preset | Session |
|------|----------------|---------|
| **Preset A** — security-minded coder | `standard` | Session 1 (write) |
| **Preset B** — feature engineer | `code` | Session 2 (read) |

Any two presets work; we use shipped names from `apps/cli/config/agent-presets/`.

**Project directory:** `examples/demo-project/` (run `git init` once).

---

## Part A — Preset A writes memory

### A1. Open the demo project

```bash
cd /path/to/open-preset-harness/examples/demo-project
git init   # skip if already a repo
```

### A2. Start Session 1 with preset `standard`

**Headless:**

```bash
cd /path/to/deepseek-harness-master
pnpm dsh --profile headless \
  --cwd /path/to/open-preset-harness/examples/demo-project \
  --agent-preset standard \
  "You are doing a security pass on this repo.

1. Call memory_status.
2. Use remember to save ONE fact in domain security:
   summary: Admin routes require step-up MFA since audit
   body: All /admin/* routes use requireStepUp middleware; no refresh tokens in localStorage.
3. Use remember to save ONE fact in domain engineering:
   summary: Public API pagination uses opaque cursors only
   body: No offset pagination on public endpoints.
4. Call memory_status again and confirm entry_count >= 2."
```

**Web:** New session → workspace = `demo-project` → preset **standard** → paste the same task.

### A3. Verify on disk

```bash
ls .dsh/memory/
cat .dsh/memory/index.md
cat .dsh/memory/domains/security.md
```

Expected: `index.md` lists `security` and `engineering` domains.

---

## Part B — Preset B reads memory (new session)

### B1. Start Session 2 with preset `code`

Important: **new session**, different preset, **same project cwd**.

**Headless:**

```bash
pnpm dsh --profile headless \
  --cwd /path/to/open-preset-harness/examples/demo-project \
  --agent-preset code \
  "You are implementing a new admin dashboard API. You were NOT in the security review.

1. Call memory_status — note domains available.
2. recall domain security — what constraints apply to admin routes?
3. recall domain engineering — any API pagination rules?
4. In one paragraph, state what you learned WITHOUT calling any other tools."
```

### B2. Success criteria

| Check | Pass if |
|-------|---------|
| Index inject | First turn mentions shared memory / domains (blank session) |
| recall security | Mentions MFA / requireStepUp / admin constraints |
| recall engineering | Mentions opaque cursors, not offset pagination |
| Token efficiency | B did not re-derive facts from scratch or read entire repo |

---

## Part C — Optional: cross-domain scenario

Preset B adds a **product** decision; Preset A reads it later:

```bash
# Session 2 continued or Session 3 with standard
remember kind=decision domain=product decision_status=accepted decision_slug=demo-feature-flag \
  summary: Ship admin dashboard behind feature flag admin_v2
```

Then new session + `recall domain product`.

---

## Recording script (~3 min)

| Time | Shot |
|------|------|
| 0:00 | Title: one project memory, every preset |
| 0:20 | Show `.dsh/memory/index.md` domains table |
| 0:45 | Session 1 `standard` → `remember` (terminal or web tool card) |
| 1:30 | New session `code` → `recall` results cited |
| 2:15 | Split screen: AGENTS.md = rules vs memory = learned facts |
| 2:45 | CTA: GitHub repo + scenario Issues |

---

## Pre-seeded shortcut

The repo includes **post-write** sample files under `examples/demo-project/.dsh/memory/`. Skip Part A and run **Part B only** to validate recall + inject.

---

## Troubleshooting

See [harness-integration.md § Troubleshooting](harness-integration.md#troubleshooting).

---

## File Issue

Worked? Open a **Scenario** Issue tagged `en-scenario`. Failed? **Bug report** with tool output + redacted `.dsh/memory/`.
