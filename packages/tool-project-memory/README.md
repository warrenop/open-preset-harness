# dsh-tool-project-memory

English | 中文见下方

**DSH Profile Bundle** — shared project organizational memory for [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness): `recall`, `remember`, `memory_status` tools + blank-session `index.md` inject. One memory pool, every preset reads.

Spec: [docs/phase-0-memory-api.md](../../docs/phase-0-memory-api.md) · Phase 1 supersede: [phase-1-supersede.md](../../docs/phase-1-supersede.md) · Phase 1 distill: [phase-1-distill.md](../../docs/phase-1-distill.md)

**Current release:** v0.3.0

## Install (DSH1024 / Profile Bundle)

Recommended — installs the bundle patch into your profile automatically:

```sh
# Interactive web profile
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"

# Headless / automation profile
dsh plugin --profile headless add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

From a local clone:

```sh
dsh plugin --profile web add ./packages/tool-project-memory
```

Verify:

```sh
dsh --profile web --dump-config | grep dsh-tool-project-memory
```

## Marketplace (DSH1024)

| Field | Value |
|-------|-------|
| **Category** | Memory |
| **Package** | `dsh-tool-project-memory` |
| **Cordis row id** | `dsh-tool-project-memory` |
| **Repository** | [warrenop/open-preset-harness](https://github.com/warrenop/open-preset-harness) (`packages/tool-project-memory`) |
| **Discovery topic** | `dsh-plugin` on the GitHub repository |

Listings on [DSH1024](https://deepseek1024.com/) require passing DSH plugin spec checks (`dsh.bundle.patch`, `cordis.patch.yml`, build output, profile install docs). See [PUBLISH.md](PUBLISH.md). Run locally:

```sh
dsh plugin --profile web add github:omdsh-dev/dsh-plugin-check
dsh run "Use plugin_check with action check on packages/tool-project-memory"
```

## Permissions

| Capability | Scope |
|------------|-------|
| **Filesystem** | Read/write `<projectRoot>/.dsh/memory/` only (domains, decisions, index) |
| **Network** | None |
| **Credentials** | None |

Requires a git project root (nearest `.git` ancestor) for stable path resolution.

## Project layout

Create in your repo:

```text
.dsh/memory/
├── index.md          # auto-generated after first remember
├── domains/
└── decisions/
```

## Development

```bash
cd packages/tool-project-memory
npm install && npm run check
```

Link against a local Harness checkout — see [docs/harness-integration.md](../../docs/harness-integration.md).

## Export surface

| Export | Role |
|--------|------|
| `.` (`apply`) | Cordis plugin entry |
| `./core` | Programmatic API without loading the plugin row |
| `rememberEntry` / `recallEntries` | Core recall/remember |
| `prepareIndexInject` | Index baseline for inject |
| `prepareDistillReminder` / `installDistillReminder` | Tier 1a turn-end remember reminder (opt-in) |

---

## 中文

**多 Preset 共享的项目组织记忆** — 在 Harness 上提供 `recall` / `remember` / `memory_status` 与空白 session 的 `index.md` 注入。

### 安装

```sh
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

### DSH1024 上架

- 分类：**Memory**
- npm 包名：`dsh-tool-project-memory`
- 仓库需打 GitHub topic：`dsh-plugin`
- 包内已含 `dsh.bundle.patch` 与 `cordis.patch.yml`，符合 Profile Bundle 规范

详见 [根 README 中文](../../README.zh.md)。
