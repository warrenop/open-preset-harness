# 工具 API

[Wiki 首页](../README.md) · 完整契约：[phase-0-memory-api.md](../../phase-0-memory-api.md)

## 工具一览

| 工具 | 作用 |
|------|------|
| `recall` | 按 query / domain 搜索项目记忆，返回带引用的摘要 |
| `remember` | 写入一条蒸馏事实或决策到 `.dsh/memory/` |
| `memory_status` | 是否已初始化、领域列表、条目计数 |

## recall

**何时用：** 需要项目上下文 — 惯例、决策、客户偏好、事故经验、跨团队约束。

**主要参数：**

| 参数 | 说明 |
|------|------|
| `query` | 自由文本搜索 summary / tags / body |
| `domain` | 限定领域 id，如 `security` |
| `kind` | `fact` \| `decision` \| `any` |
| `limit` | 1–20，默认 5 |

**输出：** `recall-result`，含 `entries[]`（id、summary、path、excerpt、`expires_at`、`expired` 等）。

UI：`presentationMeta` 持久化 entry id 与 domain，完成态卡片标题如 `mem-… · security`。

## remember

**何时用：** 沉淀 **可复用** 的项目知识 — 不是原始聊天记录。

**主要参数：**

| 参数 | 说明 |
|------|------|
| `kind` | `fact` \| `decision`（必填） |
| `domain` | 领域 id（必填） |
| `summary` | 一行摘要 10–240 字（必填） |
| `body` | Markdown 正文（必填） |
| `tags` | 最多 8 个 |
| `confidence` | `low` \| `medium` \| `high` |
| `supersedes` | 被替换的旧 entry id |
| `expires_at` | 可选 ISO 8601 UTC 过期时间 |

**写入位置：**

- `kind=fact` → `domains/<domain>.md` 追加
- `kind=decision` → `decisions/YYYY-MM-<slug>.md` 新文件

## memory_status

无参数。返回 `project_root`、`memory_dir`、各领域 `entry_count`、是否 `initialized`。

## 插件配置（cordis.patch.yml）

```yaml
config:
  indexInjectMaxBytes: 4096
  recallMaxBytes: 32768
  rememberMaxBodyBytes: 16384
  maxDomains: 64
  readOnly: false
  writeDenyDomains: []
```

可选：`projectRoot` 覆盖自动解析的根路径。

## 权限

| 能力 | 范围 |
|------|------|
| 文件系统 | 仅 `<projectRoot>/.dsh/memory/` |
| 网络 | 无 |
| 凭据 | 无 |
