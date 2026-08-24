# open-preset-harness Wiki

**多 Preset 共享的项目组织记忆** — DSH Memory 插件 `dsh-tool-project-memory`。

> 完整文档也在主仓库：[docs/wiki](https://github.com/warrenop/open-preset-harness/tree/main/docs/wiki)

## 导航

| 页面 | 说明 |
|------|------|
| [概述](概述) | 是什么、为什么 |
| [安装](安装) | pnpm、Profile Bundle |
| [架构](架构) | 三层模型 |
| [工具 API](工具-API) | recall / remember / memory_status |
| [磁盘格式](磁盘格式) | `.dsh/memory/` |
| [Demo](Demo) | 双 Preset 演示 |
| [应用场景](应用场景) | 场景索引 |
| [故障排查](故障排查) | permission、pnpm、引号 |
| [DSH1024 上架](DSH1024-上架) | 市场上架 |
| [FAQ](FAQ) | 常见问题 |

## 快速安装

```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.zshrc
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

## Spec

- [Phase 0 Memory API](https://github.com/warrenop/open-preset-harness/blob/main/docs/phase-0-memory-api.md)
- [DSH-PLUGIN.md](https://github.com/warrenop/open-preset-harness/blob/main/DSH-PLUGIN.md)
