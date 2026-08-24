# DSH Plugin — `dsh-tool-project-memory`

This monorepo ships **one** installable [DSH Profile Bundle](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish):

| Field | Value |
|-------|-------|
| **Category** | Memory |
| **Package name** | `dsh-tool-project-memory` |
| **Bundle path** | [`packages/tool-project-memory/`](packages/tool-project-memory/) |
| **Cordis row id** | `dsh-tool-project-memory` |
| **Manifest** | `packages/tool-project-memory/package.json` → `dsh.bundle.patch` |
| **Patch** | `packages/tool-project-memory/cordis.patch.yml` |
| **GitHub topic** | `dsh-plugin` (on repository root) |

## Prerequisites

- **pnpm** on PATH — `dsh plugin` uses pnpm to manage profile bundles:

```sh
corepack enable
corepack prepare pnpm@latest --activate
```

- **Quote the source** — in zsh/bash, wrap the GitHub URL in double quotes so `&` is not treated as a background operator.

## Install

```sh
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
dsh plugin --profile headless add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

Verify:

```sh
dsh --profile web --dump-config | grep dsh-tool-project-memory
```

## Tools

- `recall` — search shared project memory across presets
- `remember` — persist distilled facts to `.dsh/memory/`
- `memory_status` — inspect domains and entry counts

Full docs: [README.md](README.md) · [PUBLISH.md](PUBLISH.md) · [DSH-PLUGIN.md](../../DSH-PLUGIN.md)
