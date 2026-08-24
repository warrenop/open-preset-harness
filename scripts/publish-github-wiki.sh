#!/usr/bin/env bash
# Push docs/wiki/zh/* to GitHub Wiki (separate from docs/wiki in main repo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GITHUB_REPO:-warrenop/open-preset-harness}"
WIKI_DIR="$(mktemp -d)"
trap 'rm -rf "$WIKI_DIR"' EXIT

# Home page (GitHub Wiki landing)
cat > "$WIKI_DIR/Home.md" <<'EOF'
# open-preset-harness Wiki

**多 Preset 共享的项目组织记忆** — DSH Memory 插件 `dsh-tool-project-memory`。

> 仓库内完整文档（与 Wiki 同步来源）：[docs/wiki](https://github.com/warrenop/open-preset-harness/tree/main/docs/wiki)

## 导航

| 页面 | 说明 |
|------|------|
| [概述](概述) | 是什么、为什么 |
| [安装](安装) | pnpm、Profile Bundle |
| [架构](架构) | 三层模型、运行时 |
| [工具 API](工具-API) | recall / remember / memory_status |
| [磁盘格式](磁盘格式) | `.dsh/memory/` |
| [Demo](Demo) | 双 Preset 演示 |
| [应用场景](应用场景) | 场景索引 |
| [故障排查](故障排查) | 常见安装问题 |
| [DSH1024 上架](DSH1024-上架) | 市场与清单 |
| [FAQ](FAQ) | 常见问题 |

## 快速安装

```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.zshrc
dsh plugin --profile web add "github:warrenop/open-preset-harness#main&path:packages/tool-project-memory"
```

## 深度 Spec（主仓库）

- [Phase 0 Memory API](https://github.com/warrenop/open-preset-harness/blob/main/docs/phase-0-memory-api.md)
- [Architecture](https://github.com/warrenop/open-preset-harness/blob/main/docs/architecture.md)
- [DSH-PLUGIN.md](https://github.com/warrenop/open-preset-harness/blob/main/DSH-PLUGIN.md)
EOF

cat > "$WIKI_DIR/_Sidebar.md" <<'EOF'
### 导航

- [Home](Home)
- [概述](概述)
- [安装](安装)
- [架构](架构)
- [工具 API](工具-API)
- [磁盘格式](磁盘格式)
- [Demo](Demo)
- [应用场景](应用场景)
- [故障排查](故障排查)
- [DSH1024 上架](DSH1024-上架)
- [FAQ](FAQ)
EOF

publish_page() {
  local src_title="$1"
  local wiki_file="$2"
  local src="$ROOT/docs/wiki/zh/${src_title}.md"
  [[ -f "$src" ]] || { echo "missing: $src" >&2; exit 1; }
  # Drop first-line wiki index links; fix internal wiki links
  tail -n +3 "$src" | sed \
    -e 's|(安装.md)|[安装](安装)|g' \
    -e 's|(架构.md)|[架构](架构)|g' \
    -e 's|(Demo.md)|[Demo](Demo)|g' \
    -e 's|\[安装\](安装.md)|[安装](安装)|g' \
    -e 's|\[架构\](架构.md)|[架构](架构)|g' \
    -e 's|\[Demo\](Demo.md)|[Demo](Demo)|g' \
    -e 's|\[上架 DSH1024\](上架DSH1024.md)|[DSH1024 上架](DSH1024-上架)|g' \
    -e 's|(\.\./\.\./harness-integration\.zh\.md)|https://github.com/warrenop/open-preset-harness/blob/main/docs/harness-integration.zh.md|g' \
    -e 's|(\.\./\.\./phase-0-memory-api\.md)|https://github.com/warrenop/open-preset-harness/blob/main/docs/phase-0-memory-api.md|g' \
    -e 's|(\.\./\.\./architecture\.md)|https://github.com/warrenop/open-preset-harness/blob/main/docs/architecture.md|g' \
    -e 's|(\.\./\.\./demo-walkthrough\.zh\.md)|https://github.com/warrenop/open-preset-harness/blob/main/docs/demo-walkthrough.zh.md|g' \
    -e 's|(\.\./\.\./scenarios\.md)|https://github.com/warrenop/open-preset-harness/blob/main/docs/scenarios.md|g' \
    -e 's|(\.\./\.\./\.\./packages/tool-project-memory/PUBLISH\.md)|https://github.com/warrenop/open-preset-harness/blob/main/packages/tool-project-memory/PUBLISH.md|g' \
    > "$WIKI_DIR/${wiki_file}.md"
}

publish_page "概述" "概述"
publish_page "安装" "安装"
publish_page "架构" "架构"
publish_page "工具API" "工具-API"
publish_page "磁盘格式" "磁盘格式"
publish_page "Demo" "Demo"
publish_page "场景" "应用场景"
publish_page "故障排查" "故障排查"
publish_page "上架DSH1024" "DSH1024-上架"
publish_page "FAQ" "FAQ"

if ! git clone "https://github.com/${REPO}.wiki.git" "$WIKI_DIR/repo" 2>/dev/null; then
  echo "ERROR: GitHub Wiki 仓库尚不存在。" >&2
  echo "请先在浏览器创建首页: https://github.com/${REPO}/wiki" >&2
  echo "Title=Home，正文见 docs/wiki/Home-初始页.md" >&2
  echo "然后重新运行: $0" >&2
  exit 1
fi

cp "$WIKI_DIR"/*.md "$WIKI_DIR/repo/"
git -C "$WIKI_DIR/repo" add -A
git -C "$WIKI_DIR/repo" -c user.email="wiki@open-preset-harness" -c user.name="open-preset-harness" \
  commit -m "Sync wiki from docs/wiki/zh (main repo)." || true
git -C "$WIKI_DIR/repo" push -u origin HEAD:master 2>/dev/null \
  || git -C "$WIKI_DIR/repo" push -u origin HEAD:main

echo "Done: https://github.com/${REPO}/wiki"
