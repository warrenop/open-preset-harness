#!/usr/bin/env bash
# 最小依赖安装 + 测试（避免完整 npm install 卡住）
set -euo pipefail
cd "$(dirname "$0")"

echo "→ 若已有卡住的 npm，请先 Ctrl+C 或: kill \$(pgrep -f 'npm install' | head -1)"

PACKAGES=(yaml vitest typescript @types/node)
for pkg in "${PACKAGES[@]}"; do
  if [[ ! -d "node_modules/${pkg%%@*}" ]]; then
    echo "→ 安装 $pkg ..."
    npm install "$pkg" --no-save --no-audit --no-fund --prefer-offline 2>/dev/null \
      || npm install "$pkg" --no-save --no-audit --no-fund
  else
    echo "✓ $pkg 已存在"
  fi
done

echo "→ 运行测试 ..."
npx vitest run
