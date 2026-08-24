# FAQ

[Wiki 首页](../README.md)

## 这和向量数据库 / RAG 有什么区别？

Phase 0 是 **文件型、按领域组织、Git 可 review** 的项目记忆，不是通用 embedding 检索。按需 `recall` 有字节预算，避免每轮灌整库。

## 每个 Preset 有自己的记忆吗？

**没有。** 一个 git 项目 **一份** 记忆池，按 **domain** 组织，不按 Preset id。

## 记忆存在哪？

`<projectRoot>/.dsh/memory/`。建议提交进 repo，与代码一起 review。

## 和 `.dsh/skills` 怎么分工？

- **Skills** = 可复用的 **怎么做**（流程、工具用法）
- **Project memory** = **学到了什么**（事实、决策、坑）

## 和 AGENTS.md 怎么分工？

- **AGENTS.md** = 静态规范、团队约定
- **Memory** = 运行中 **蒸馏** 出的项目事实

## 需要 DeepSeek 官方支持吗？

否。独立社区项目，MIT；上游为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness)。

## 有 AI 生成代码比例要求吗？

**无。** DSH1024 / 本仓库均无 AI 代码占比门槛。建议对权限与写盘路径做人工审阅。

## 之后可能增加什么？

按社区需求迭代，见 README **Roadmap**（仅列能力方向，无时间表）：可选语义检索、domain 写入治理、distill hook 等。

## 如何反馈场景？

[Scenario Issue](https://github.com/warrenop/open-preset-harness/issues/new?template=scenario.yml)，标 `cn-scenario` 或 `en-scenario`。
