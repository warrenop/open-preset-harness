# 知乎 / 公众号首发稿

[English outline](launch-post.md) | 中文

> 约 800 字，可直接粘贴后按平台微调标题与配图。

---

## 标题备选

1. **多角色 AI 团队，为什么需要「项目记忆」？**
2. **Preset 换了，经验不能换：我们在 Harness 上做的组织记忆层**
3. **一份知识库，所有工种可读：open-preset-harness 开源发布**

---

## 正文

智能体越来越像团队里的多个工种：有人偏安全审查，有人写 API，有人对接产品。DeepSeek Harness 用 **Preset** 区分角色，用 **Session Log** 记录单次对话——工程上很干净。但团队真正积累的东西，往往落在两次会话之间：「admin 路由必须 step-up MFA」「公开 API 只用 opaque cursor 分页」。这些信息不属于某一个 Preset，也不该每次新 session 从零扫仓库再推导一遍。

我们开源了 **[open-preset-harness](https://github.com/warrenop/open-preset-harness)**：在 Harness 之上加一层 **项目级组织记忆**。同一 git 项目下，任意 Preset 可以 `remember` 沉淀事实，任意 Preset 可以 `recall` 按需召回。记忆按 **领域**（如 `security`、`engineering`、`product`）组织，而不是按角色 silo——安全同学写的约束，开发 Preset 下一条 session 就能读到。

### 一个 3 分钟能讲清的 Demo

场景：Preset A（偏全栈/安全）刚做完评审，Preset B（偏功能开发）要做 admin dashboard API，但没参加过那场评审。

1. **Session 1，`standard` preset**：`remember` 写入 `security` 域（MFA、refresh token 不落 localStorage）和 `engineering` 域（分页只用 opaque cursor）。
2. **Session 2，新会话，`code` preset**：`recall domain security` / `recall domain engineering`，用一段话总结约束——**不必再全仓库搜索、不必重复浪费 token**。

磁盘上是项目里的 `.dsh/memory/`：有 `index.md` 和按域拆分的 markdown，带 YAML frontmatter，可 diff、可 review、可 PR。这和「又一个向量库 Demo」不同：我们优先 **可读、可追溯、符合 Harness 约束**。

### 为什么坚持「进模型必进日志」

Harness 有一条硬 invariant：**model-visible ⟺ logged**。项目记忆如果悄悄 inject 却不在 session 里留痕，就破坏了审计与回放。open-preset-harness 的 `remember` / `recall` 都走 tool 调用，写入与读取都会进入 Session Log——换 Preset、换 session，仍然能从日志还原「模型当时知道了什么」。

### 我们不是什么

- **不是** Harness 的 fork 或替代品；是插件 + 约定目录的社区扩展。
- **不是** 每个 Preset 各记各的 silo。
- **不是** 宣称发明了 AI 记忆——我们解决的是 **多角色、多 session 下经验如何复利** 这一整合问题。

上游 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 仍是核心运行时；我们保留 MIT 合规与 NOTICE，身份上是 **独立社区项目**。

### 现在能用什么

Phase 0 已提供三个 tool：`memory_status`、`remember`、`recall`。接入方式：本地 link 插件，把 patch 写入 `~/.dsh/profiles/<profile>/cordis.patch.yml`，在 git 项目里跑 demo。仓库含 `examples/demo-project` 预置样本，也可一键 headless：

```bash
export DEEPSEEK_API_KEY=...
./scripts/demo-headless.sh
```

文档：[架构](https://github.com/warrenop/open-preset-harness/blob/main/docs/architecture.md)、[双 Preset walkthrough](https://github.com/warrenop/open-preset-harness/blob/main/docs/demo-walkthrough.zh.md)、[Harness 接入](https://github.com/warrenop/open-preset-harness/blob/main/docs/harness-integration.zh.md)。

### 想一起打磨场景

如果你也在用多 Preset 协作，欢迎到 GitHub：

- **Scenario Issue**：描述「角色 A 沉淀 → 角色 B 召回」的真实故事（模板已备好）
- **Bug / Feature**：接入或 recall 不符合预期请带脱敏日志

Issue #1 已放了一个种子场景；中文场景可标 `cn-scenario`。目标是让 **项目记忆** 像团队 Wiki 一样被多个工种共用，而不是锁在某一次聊天里。

**Repo：** https://github.com/warrenop/open-preset-harness  
**一句话：** 一份项目记忆，所有 Preset 可读——让团队经验随 session 复利，而不是随会话蒸发。

---

## 配图 / 录屏建议

| 素材 | 说明 |
|------|------|
| 架构简图 | README 中的「项目记忆 ↔ 多 Preset」示意 |
| 终端录屏 | `demo-headless.sh` Part A → Part B，或 Web 双 session |
| 磁盘 diff | `.dsh/memory/index.md` + 某 domain 文件 |
| GitHub | Scenario Issue 模板截图 |

---

## 发布 checklist

- [ ] 知乎：技术类话题 + DeepSeek / Agent 相关标签
- [ ] 公众号：摘要 120 字内，文末放 Repo 与 Issue 链接
- [ ] 评论区置顶：接入文档与「预置样本可只跑 Part B」说明
- [ ] 可选：3 分钟录屏上传 B 站/视频号，文稿内嵌链接
