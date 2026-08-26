# DSH1024 / Profile Bundle publish checklist

Use this before expecting [DSH1024](https://deepseek1024.com/) discovery or sharing install links.

## Plugin identity

| Item | Value |
|------|-------|
| Category | **Memory** |
| npm / bundle name | `dsh-tool-project-memory` |
| Cordis row id | `dsh-tool-project-memory` |
| Repository | [warrenop/open-preset-harness](https://github.com/warrenop/open-preset-harness) |
| Subpath | `packages/tool-project-memory` |
| Root pointer | [`DSH-PLUGIN.md`](../../DSH-PLUGIN.md) |

## Spec compliance (Profile Bundle)

- [x] `package.json` declares `dsh.bundle.patch` → `./cordis.patch.yml`
- [x] `cordis.patch.yml` with `- insert:` row `name: dsh-tool-project-memory`
- [x] `main` → Cordis plugin entry (`lib/plugin.js`)
- [x] `files`: `lib`, `src`, `cordis.patch.yml`
- [x] `scripts.prepack` / `prepare` → build `lib/` on install
- [x] MIT `LICENSE`, install + permissions in README
- [x] GitHub topic: `dsh-plugin`

## Prerequisites

- **pnpm** — install without sudo (avoids `corepack enable` EACCES on `/usr/local/bin`):

```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.zshrc
```

- **Quote the GitHub source** — the `&` in `#main&path:…` must be inside double quotes in zsh/bash.

## Install (canonical monorepo source)

```sh
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
dsh plugin --profile headless add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

Local checkout:

```sh
dsh plugin --profile web add ./packages/tool-project-memory
```

## Verify

```sh
cd packages/tool-project-memory && npm run check
dsh --profile web --dump-config | grep dsh-tool-project-memory
```

Optional static audit:

```sh
dsh plugin --profile web add github:omdsh-dev/dsh-plugin-check
dsh run "Use plugin_check with action check on packages/tool-project-memory"
```

## DSH1024 listing

DSH1024 indexes public repos with topic **`dsh-plugin`** and static bundle evidence. There is **no manual submit form** — listing is automatic and may lag **1–3 days** after push.

Search: [deepseek1024.com/plugins?q=dsh-tool-project-memory](https://deepseek1024.com/plugins?q=dsh-tool-project-memory)

Until listed, users can install directly via the GitHub source above.

Pin a release:

```sh
dsh plugin --profile web add "github:warrenop/open-preset-harness#v0.2.0&path:packages/tool-project-memory"
```

Latest tag: [v0.2.0](https://github.com/warrenop/open-preset-harness/releases/tag/v0.2.0)
