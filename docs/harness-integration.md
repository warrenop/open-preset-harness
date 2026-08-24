# Harness integration guide

English | [中文](harness-integration.zh.md)

Wire **open-preset-harness** into a local [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) checkout. Assumes sibling directories:

```text
mygit/
├── deepseek-harness-master/    # upstream Harness
└── open-preset-harness/        # this repo
```

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Node | ^22.19 or >=24 (same as Harness) |
| Harness built | `pnpm install && pnpm run build` in Harness repo |
| `DEEPSEEK_API_KEY` | For live agent smoke (optional for tool registration check) |
| Git project | Demo target needs `.git` for project-root resolution |

---

## Step 1 — Build the memory package

```bash
cd /path/to/open-preset-harness/packages/tool-project-memory

npm install
npm test                    # 5 tests — core logic
npm run build               # emits lib/ (core + plugin)
```

**Plugin build note:** `tsc -p tsconfig.plugin.json` type-checks against Harness peers. If types are missing:

```bash
# From Harness root — link peers into the global npm link store
cd /path/to/deepseek-harness-master
pnpm install

cd packages/core/tools && npm link
cd ../agent && npm link
cd ../../llm/llm && npm link
cd ../../../vendor/cordis/cordis && npm link

cd /path/to/open-preset-harness/packages/tool-project-memory
npm link @deepseek-ai/cordis @deepseek-ai/dsh-tools @deepseek-ai/dsh-agent @deepseek-ai/dsh-llm
npm run build
```

---

## Step 2 — Link the package into Harness

**Recommended (no global npm link):**

```bash
chmod +x scripts/install-harness-link.sh
./scripts/install-harness-link.sh /path/to/deepseek-harness-master
```

This symlinks `node_modules/dsh-tool-project-memory` → this package.

**Preferred (Profile Bundle — DSH1024 compatible):**

```bash
dsh plugin --profile headless add github:warrenop/open-preset-harness#path:packages/tool-project-memory
# or from local clone:
dsh plugin --profile headless add ./packages/tool-project-memory
```

Alternative: `npm link` (requires permission to write global `node_modules`) or pnpm `link:` override — see below.

---

## Step 3 — Add the plugin to your profile

Copy [examples/harness-plugin.cordis.patch.yml](../examples/harness-plugin.cordis.patch.yml) into your Harness **profile patch**.

Typical locations:

| Profile | Patch file |
|---------|------------|
| headless (CLI) | `~/.dsh/profiles/headless/cordis.patch.yml` or repo `apps/cli` overlay |
| web | `~/.dsh/profiles/web/cordis.patch.yml` |

Append (use **`insert`**, not a bare row — patch ids must exist or use insert):

```yaml
- insert:
    - id: dsh-tool-project-memory
      name: dsh-tool-project-memory
      config:
        indexInjectMaxBytes: 4096
        recallMaxBytes: 32768
        rememberMaxBodyBytes: 16384
        maxDomains: 64
        readOnly: false
        writeDenyDomains: []
```

Confirm the tree:

```bash
cd /path/to/deepseek-harness-master
pnpm dsh --profile headless --dump-config | rg tool-project-memory
```

---

## Step 4 — Smoke test in a git project

```bash
cd /path/to/open-preset-harness/examples/demo-project
git init   # if needed — project root = nearest .git ancestor
```

Run Harness (headless example):

```bash
cd /path/to/deepseek-harness-master
pnpm dsh --profile headless --cwd examples/demo-project \
  "Call memory_status, then remember one fact in domain onboarding: we use open-preset-harness for shared project memory."
```

Check disk:

```bash
ls -la examples/demo-project/.dsh/memory/
cat examples/demo-project/.dsh/memory/index.md
```

Second session — recall:

```bash
pnpm dsh --profile headless --cwd /path/to/open-preset-harness/examples/demo-project \
  "Use recall with domain onboarding. Summarize what the project already knows."
```

---

## Step 5 — Web UI (optional)

Same patch in `web` profile. Start web, pick two presets (e.g. `standard` and `code`), run the [demo walkthrough](demo-walkthrough.md).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Plugin not in `--dump-config` | Patch not applied to active profile; check patch path |
| `Cannot find package 'dsh-tool-project-memory'` | Re-run `npm link` / pnpm override / `dsh plugin add` |
| `remember` writes nowhere | cwd has no `.git`; project root falls back to cwd — check `memory_status.project_root` |
| Tools missing on preset | Plugin is host-plane; should appear on all presets once patch loads |
| Plugin build type errors | Link Harness peer packages (Step 1) |

---

## Uninstall

Remove the patch row, then:

```bash
cd /path/to/deepseek-harness-master
npm unlink dsh-tool-project-memory
```

Project memory files under `.dsh/memory/` remain — delete manually if unwanted.

---

## Next

- [Dual-preset demo walkthrough](demo-walkthrough.md)
- [Phase 0 API](phase-0-memory-api.md)
