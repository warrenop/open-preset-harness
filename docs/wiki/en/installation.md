# Installation

[Wiki home](../README.md) · [中文](../zh/安装.md) · [DSH-PLUGIN.md](../../../DSH-PLUGIN.md)

## pnpm (no sudo)

```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.zshrc
```

Do **not** use `corepack enable` on macOS if Node is in `/usr/local` (EACCES).

## Install bundle

**Quote** the GitHub source in zsh/bash:

```sh
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

Verify:

```sh
dsh --profile web --dump-config | grep dsh-tool-project-memory
```

Dev linking: [harness-integration.md](../../harness-integration.md)
