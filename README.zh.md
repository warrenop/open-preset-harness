# open-preset-harness

**多角色 AI 智能体的项目记忆 — 一份知识库，所有 Preset 可读。**

[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 智能体会话结束就「忘」；团队不会。  
> **open-preset-harness** 在 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 之上增加 **项目级组织记忆层**：任意工种（Preset）可沉淀经验，任意工种可按需召回。

---

## 为什么做这个项目

Harness 把 **Preset（壳）** 和 **Session Log（单次对话记忆）** 分开——这对工程是对的。但 **团队经验属于项目**，不属于某一次会话或某一个 Preset。

没有共享记忆时：

- 安全审查 Preset 每个迭代重复踩同样的鉴权坑
- 新人 Preset 反复问三个月前已答过的问题
- 产品定案随 PM 会话结束而消失
- Token 浪费在「每个角色从零重建上下文」

**open-preset-harness** 让项目经验 **随时间复利** —— 像团队真正会用的 Wiki，且符合 Harness「进模型必进日志」的约束。

---

## 是什么 / 不是什么

| | |
|---|---|
| **是** | 面向 Harness 多 Preset 的 **开源项目组织记忆** |
| **是** | 按领域组织、按需召回、贡献可追溯 |
| **不是** | Harness 的替代品（我们是扩展） |
| **不是** | 每个 Preset 各记各的 silo，或泛泛的向量库 Demo |
| **不是** | 宣称「发明了 AI 记忆」— 我们做的是 **多角色团队场景下的正确整合** |

---

## 与 DeepSeek Harness 的关系

- **上游：** [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness)（MIT）
- **策略：** 优先 **插件 + 约定目录**，避免硬分叉；跟进上游版本
- **合规：** 保留上游版权，见 [NOTICE](NOTICE)
- **身份：** **独立社区项目**，非 DeepSeek 官方产品

详见 [docs/architecture.md](docs/architecture.md)、[docs/phase-0-memory-api.md](docs/phase-0-memory-api.md)。

---

## 核心概念

```text
┌─────────────────────────────────────────────────────────┐
│              项目记忆（共享）                                │
│   index · domains · decisions · 蒸馏后的经验               │
└────────────────────────▲────────────────────────────────┘
                         │ 写入 remember / 读取 recall
     ┌───────────────────┼───────────────────┐
  Preset A            Preset B            Preset C
  Session 1           Session 2           Session N
```

**设计原则**

- **每个项目一份记忆池** — 所有 Preset 可读（写入可治理）
- **按领域/主题组织**，不按 Preset id
- **索引 + 按需 recall** — 避免每轮灌入整库
- **Model-visible ⟺ logged**

默认目录：`<projectRoot>/.dsh/memory/`（结构见英文 README 与 API 文档）

---

## 应用场景

| 场景 | 谁写入 | 谁读取 | 价值 |
|------|--------|--------|------|
| **跨职能协作** | 任意 Preset | 其他 Preset | 经验不锁在某次会话 |
| **研发 ↔ 测试** | 开发 Preset | 测试 Preset | 减少反复对齐 |
| **产品 ↔ 研发** | PM Preset | 研发 Preset | 定案与 rationale 可检索 |
| **安全 / 合规** | 审查 Preset | 全部 Preset | 约束自动传播 |
| **新人上手** | 老人长期沉淀 | 新人 Preset | 少打断 senior |
| **开源维护** | 分拣 Preset | 发版 Preset | 已知坑与惯例共享 |
| **乙方 / 客户** | 商务 Preset | 交付 Preset | 客户偏好随 repo 走 |
| **科研 → 写作** | 文献 Preset | 撰稿 Preset | 结论可引用 |
| **SRE / 故障** | 复盘 Preset | 排障 Preset | 故障经验复用 |
| **设计系统** | 设计 Preset | 前端 Preset | Token 与例外一致 |
| **国际化** | 翻译 Preset | 开发 Preset | 术语统一 |
| **数据 / ML** | EDA Preset | 建模 Preset | 数据坑留存 |

更多见 [docs/scenarios.md](docs/scenarios.md)。

---

## 当前状态

🚧 **早期试水 — 中英文社区同步验证概念。**

| 里程碑 | 状态 |
|--------|------|
| 项目记忆 API 草案 | ✅ [phase-0-memory-api.md](docs/phase-0-memory-api.md) |
| 文件约定 `.dsh/memory/` | ✅ 插件 core 已实现 |
| `remember` / `recall` 插件 | ✅ [dsh-tool-project-memory](packages/tool-project-memory)（DSH1024 Profile Bundle） |
| 双 Preset Demo | 📝 [walkthrough](docs/demo-walkthrough.zh.md) + [demo-project](examples/demo-project/) |

---

## Roadmap

### Phase 0（第 1–4 周）

- [x] Memory API 草案
- [ ] Harness 插件实现
- [ ] Demo 录屏
- [ ] 场景库扩充

### Phase 1–3

与 [README.md](README.md) 英文版 Roadmap 一致。

---

## 快速开始

1. [Harness 接入](docs/harness-integration.zh.md) — 或一键安装：`dsh plugin --profile web add github:warrenop/open-preset-harness#path:packages/tool-project-memory`
2. [双 Preset Demo](docs/demo-walkthrough.zh.md) — 或 `./scripts/demo-headless.sh`（需 `DEEPSEEK_API_KEY`）
3. 用 [Scenario Issue](.github/ISSUE_TEMPLATE/scenario.yml) 反馈，标 `cn-scenario` 或 `en-scenario`

首发稿大纲：[docs/launch-post.zh.md](docs/launch-post.zh.md)

```bash
chmod +x scripts/link-harness.sh
./scripts/link-harness.sh /path/to/deepseek-harness-master
```

---

## 参与贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

Issue 请标注 `[cn-scenario]` 或 `[en-scenario]`，便于统计市场信号。

---

## 许可证

MIT — [LICENSE](LICENSE)、[NOTICE](NOTICE)
