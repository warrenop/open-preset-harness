# 双 Preset Demo  walkthrough

[English](demo-walkthrough.md) | 中文

**目标：** Preset A 写入项目记忆 → Preset B 新 session 读取 — 不重复劳动、不浪费 token  rediscover。

**耗时：**  live 约 10 分钟 · 录屏约 3 分钟

**前置：** 已完成 [Harness 接入](harness-integration.zh.md)

---

## 角色

| 角色 | Harness preset | Session |
|------|----------------|---------|
| **Preset A** — 偏安全/全栈 | `standard` | Session 1（写） |
| **Preset B** — 功能开发 | `code` | Session 2（读） |

**项目目录：** `examples/demo-project/`（先 `git init`）

---

## Part A — Preset A 写入记忆

### A1. 进入 demo 项目

```bash
cd open-preset-harness/examples/demo-project
git init
```

### A2. Session 1，preset `standard`

**Headless 示例：**

```bash
cd deepseek-harness-master
pnpm dsh --profile headless \
  --cwd ../open-preset-harness/examples/demo-project \
  --agent-preset standard \
  "1. 调用 memory_status
2. remember 写入 security 域：Admin routes require step-up MFA since audit（正文写 requireStepUp、禁止 localStorage 存 refresh token）
3. remember 写入 engineering 域：Public API pagination uses opaque cursors only
4. 再 memory_status 确认 entry_count >= 2"
```

**Web：** 新建 session → 工作区选 demo-project → preset **standard** → 粘贴同类任务。

### A3. 检查磁盘

```bash
ls .dsh/memory/
cat .dsh/memory/index.md
```

应看到 `security`、`engineering` 两个 domain。

---

## Part B — Preset B 读取（新 session）

### B1. Session 2，preset `code`

**必须是新 session、不同 preset、同一 cwd。**

```bash
pnpm dsh --profile headless \
  --cwd ../open-preset-harness/examples/demo-project \
  --agent-preset code \
  "你要做 admin dashboard API，你没参加过安全评审。
1. memory_status
2. recall domain security — admin 有什么约束？
3. recall domain engineering — 分页规则？
4. 用一段话总结，不要再用其他工具。"
```

### B2. 成功标准

| 检查项 | 通过条件 |
|--------|----------|
| 启动 inject | 首 turn 能看到 index / 共享记忆提示 |
| recall security | 提到 MFA / requireStepUp / admin |
| recall engineering | 提到 opaque cursor，非 offset |
| 省 token | B 没有从零扫仓库 re-derive |

---

## Part C（可选）— 跨域追加

B 写入 `product` 决策，之后 A 再 `recall domain product`。

---

## 录屏脚本（约 3 分钟）

| 时间 | 画面 |
|------|------|
| 0:00 | 标题：一份项目记忆，所有 preset 可读 |
| 0:20 | 展示 index.md 领域表 |
| 0:45 | Session 1 standard → remember |
| 1:30 | 新 session code → recall |
| 2:15 | 对比：AGENTS.md = 规范，memory = 沉淀的事实 |
| 2:45 | GitHub + Scenario Issue |

---

## 预置样本（跳过 Part A）

仓库已含写入后的 `examples/demo-project/.dsh/memory/`，可直接跑 **Part B** 验证 recall。

---

## 反馈

好用 → Issue 模板 **Scenario**，标 `cn-scenario`；失败 → **Bug report** + 脱敏后的 tool 输出。
