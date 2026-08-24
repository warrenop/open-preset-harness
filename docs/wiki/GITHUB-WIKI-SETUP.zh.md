# GitHub Wiki 与 docs/wiki 的区别

## 为什么 GitHub Wiki 标签页是空的？

这是 **两个不同的系统**：

| | **GitHub Wiki**（标签页） | **docs/wiki/**（主仓库内） |
|--|---------------------------|---------------------------|
| 位置 | 独立 git 仓库 `*.wiki.git` | `docs/wiki/` 目录 |
| 我们已写内容 | ❌ 需单独推送 | ✅ 已有完整中英文档 |
| 入口 | 仓库 → Wiki 标签 | [docs/wiki/README.md](README.md) |

之前提交的是 **仓库内 Wiki**（`docs/wiki/`），不会自动出现在 GitHub 的 Wiki 标签页。

## 让 GitHub Wiki 也有内容

### 方式 A：浏览器创建首页（只需一次）

1. 打开 [Wiki](https://github.com/warrenop/open-preset-harness/wiki) → **Create the first page**
2. Title 填 **`Home`**
3. 正文复制 [Home-初始页.md](Home-初始页.md) 的内容 → Save
4. 本地运行同步脚本，推送其余页面：

```sh
chmod +x scripts/publish-github-wiki.sh
./scripts/publish-github-wiki.sh
```

### 方式 B：只看仓库内 Wiki（推荐）

无需 GitHub Wiki，直接阅读：

- [Wiki 首页](README.md)
- [中文：概述](zh/概述.md) · [安装](zh/安装.md) · [故障排查](zh/故障排查.md)

根 README 上的 **Wiki** badge 指向此处。

## 维护

- 编辑 `docs/wiki/` 后：`git commit` 到 main 仓库
- 若使用 GitHub Wiki：再跑 `./scripts/publish-github-wiki.sh` 同步
