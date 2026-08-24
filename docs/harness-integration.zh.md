# Harness 接入指南

[English](harness-integration.md) | 中文

将 **open-preset-harness** 接入本地 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness)  checkout。目录建议并列：

```text
mygit/
├── deepseek-harness-master/
└── open-preset-harness/
```

---

## 前置条件

| 项 | 说明 |
|----|------|
| Node | ^22.19 或 >=24 |
| Harness 已构建 | 在 Harness 仓库 `pnpm install && pnpm run build` |
| `DEEPSEEK_API_KEY` | 真实 agent 冒烟时需要 |
| Git 项目 | 需 `.git` 才能稳定解析 project root |

---

## 步骤 1 — 构建 memory 包

```bash
cd /path/to/open-preset-harness/packages/tool-project-memory
npm install && npm test && npm run build
```

插件层需要 Harness 类型时，在 Harness 各 peer 包目录执行 `npm link`，再在 memory 包内 `npm link @deepseek-ai/cordis` 等 — 详见 [英文版 Step 1](harness-integration.md#step-1--build-the-memory-package)。

---

## 步骤 2 — 安装到 Profile（推荐，DSH1024 规范）

```bash
dsh plugin --profile headless add github:warrenop/open-preset-harness#main&path:packages/tool-project-memory
# 或本地 clone：
dsh plugin --profile headless add ./packages/tool-project-memory
```

## 步骤 2b — link 到 Harness（开发调试）

```bash
cd open-preset-harness/packages/tool-project-memory && npm link
cd deepseek-harness-master && npm link dsh-tool-project-memory
```

pnpm 用户可在 Harness 根 `package.json` 加：

```json
"pnpm": {
  "overrides": {
    "dsh-tool-project-memory": "link:../open-preset-harness/packages/tool-project-memory"
  }
}
```

---

## 步骤 3 — 写入 profile patch

将 [examples/harness-plugin.cordis.patch.yml](../examples/harness-plugin.cordis.patch.yml) 内容追加到 profile 的 `cordis.patch.yml`（如 `~/.dsh/profiles/headless/cordis.patch.yml`）。

验证：

```bash
pnpm dsh --profile headless --dump-config | rg tool-project-memory
```

---

## 步骤 4 — 在 git 项目里冒烟

```bash
cd open-preset-harness/examples/demo-project
pnpm dsh --profile headless --cwd . \
  "调用 memory_status，再用 remember 在 onboarding 域写一条项目事实。"
ls .dsh/memory/
```

新 session 再 `recall` — 见 [demo-walkthrough.zh.md](demo-walkthrough.zh.md)。

---

## 故障排查

| 现象 | 处理 |
|------|------|
| dump-config 无插件 | patch 路径或 profile 不对 |
| 找不到包 | 重做 npm link / pnpm override |
| 写盘失败 | 确认 cwd / project_root；看 `memory_status` |

---

## 下一步

- [双 Preset Demo  walkthrough](demo-walkthrough.zh.md)
- [Phase 0 API](phase-0-memory-api.md)
