# 配置参考

[English](config-reference.md)

`dsh-tool-project-memory` 完整配置。除注明外，**默认均为关闭/空**。

---

## 核心

| 键 | 默认 | 说明 |
|----|------|------|
| `memoryDir` | `.dsh/memory` | 记忆目录 |
| `indexInjectMaxBytes` | `4096` | 空白 session index 注入上限 |
| `recallMaxBytes` | `32768` | recall 输出预算 |
| `rememberMaxBodyBytes` | `16384` | remember body 上限 |

---

## 写入治理（Phase 3）

| 键 | 说明 |
|----|------|
| `readOnly` | 全局只读 |
| `writeDenyDomains` / `writeAllowDomains` | domain 拒绝/白名单 |
| `writeDenyPresets` / `writeAllowPresets` | preset 拒绝/白名单 |
| `writeApprovalDomains` | remember 前 Harness 审批 |

---

## 蒸馏（Phase 1）

| 键 | Tier | 说明 |
|----|------|------|
| `distillReminder` | 1a | turn 结束提醒 |
| `distillCompactionReminder` | 1b | compaction 后提醒 |
| `distillAssist` | 2 | `suggest_memory_candidates` 工具 |
| `distillAuto` | 3 | 启发式自动 remember |
| `distillAutoLlm` | 3+ | 自动写前 LLM 过滤 |

完整字段见 [英文版](config-reference.md)。

---

## 召回（Phase 2）

| 键 | 说明 |
|----|------|
| `recallRanking` | `token` / `legacy` / `vector` |
| `vectorSidecar` | 向量 sidecar |
| `vectorEmbedModel` | `local-fhash-v1` 或 `llm-keywords-v1` |

---

## Memory LLM

启用 `distillAutoLlm` 或 `vectorEmbedModel: llm-keywords-v1` 时需配置：

```yaml
memoryLlmProvider: deepseek
memoryLlmModel: deepseek-chat
```

需 Harness 挂载 `ctx.llm`；不可用时回退启发式。

---

## 示例

见 [config-reference.md](config-reference.md) 与 [SRE 场景手册](scenarios/sre-postmortem-playbook.md)。
