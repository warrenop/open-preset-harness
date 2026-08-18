# @open-preset-harness/dsh-tool-project-memory

English | 中文见 [根 README](../../README.zh.md)

Cordis plugin: **`recall`**, **`remember`**, **`memory_status`** + blank-session **`index.md`** inject.

Spec: [docs/phase-0-memory-api.md](../../docs/phase-0-memory-api.md)

## Install (development)

Link against a local [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) checkout:

```bash
cd open-preset-harness
pnpm install
pnpm --filter @open-preset-harness/dsh-tool-project-memory build
```

Add to your Harness profile `cordis.patch.yml`:

```yaml
- id: dsh-tool-project-memory
  plugin: "@open-preset-harness/dsh-tool-project-memory"
  config:
    indexInjectMaxBytes: 4096
    recallMaxBytes: 32768
    rememberMaxBodyBytes: 16384
    maxDomains: 64
```

Ensure the package resolves from your install path (file: link or npm publish).

## Project layout

Create in your repo:

```text
.dsh/memory/
├── index.md          # auto-generated after first remember
├── domains/
└── decisions/
```

## Test

```bash
npm install && npm test
```

Core tests (`remember` / `recall` / frontmatter) run without Harness installed. Harness peers are optional until you link a local [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) checkout for `npm run build` (plugin entry).

## Export surface

| Export | Role |
|--------|------|
| `apply(ctx, config)` | Cordis plugin entry |
| `rememberEntry` / `recallEntries` | Programmatic API |
| `prepareIndexInject` | Index baseline for inject |
