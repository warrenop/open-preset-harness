#!/usr/bin/env bash
# Symlink open-preset-harness into Harness node_modules (no global npm link).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="${1:-$ROOT/../deepseek-harness-master}"
PKG="$ROOT/packages/tool-project-memory"
TARGET="$HARNESS/node_modules/@open-preset-harness/dsh-tool-project-memory"
mkdir -p "$(dirname "$TARGET")"
ln -sfn "$PKG" "$TARGET"
node -e "import('$TARGET/lib/plugin.js').then(m => console.log('Linked plugin:', m.name))"
