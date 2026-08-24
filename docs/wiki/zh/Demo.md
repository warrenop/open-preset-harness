# Demo  walkthrough

[Wiki 首页](../README.md) · 详述：[demo-walkthrough.zh.md](../../demo-walkthrough.zh.md)

## 目标

Preset A **写入** 项目记忆 → Preset B **新 session 读取**，证明跨 Preset 共享、不重复 rediscover。

## 角色

| 角色 | Preset | Session |
|------|--------|---------|
| Preset A（偏安全/全栈） | `standard` | Session 1 写 |
| Preset B（功能开发） | `code` | Session 2 读 |

项目目录：`examples/demo-project/`（需 `git init`）

## 一键 headless

```bash
export DEEPSEEK_API_KEY=...   # 或 ~/.dsh/.credentials.yaml
chmod +x scripts/demo-headless.sh
./scripts/demo-headless.sh              # Part A + B
./scripts/demo-headless.sh --part-b     # 仅 Part B
./scripts/demo-headless.sh --fresh      # 清空 memory 后重跑 Part A
```

## Part A — 写入

在 demo 项目里让 agent：

1. `memory_status`
2. `remember` 在 `security` 域写 JWT 轮换事实
3. `remember` 在 `engineering` 域写构建命令事实

检查：

```bash
ls examples/demo-project/.dsh/memory/
cat examples/demo-project/.dsh/memory/index.md
```

## Part B — 读取

**新开 session**，换 `code` preset，让 agent：

1. `recall` domain=security
2. 总结项目已知约束，**不应** 重新发明 Part A 已写内容

## 预置样例

`examples/demo-project/.dsh/memory/` 含 Part A 完成后的示例状态，可跳过 live Part A 直接试 Part B。
