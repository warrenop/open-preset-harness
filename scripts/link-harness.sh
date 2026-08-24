#!/usr/bin/env bash
# Link open-preset-harness into a local DeepSeek Harness checkout (sibling dirs).
set -euo pipefail

OPH_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="${1:-$OPH_ROOT/../deepseek-harness-master}"
OPH="${2:-$OPH_ROOT}"

HARNESS="$(cd "$HARNESS" && pwd)"
OPH_PKG="$(cd "$OPH/packages/tool-project-memory" && pwd)"

echo "Harness: $HARNESS"
echo "Plugin:  $OPH_PKG"

cd "$OPH_PKG"
npm install
npm test
npm run build
npm link

cd "$HARNESS"
if [[ -f pnpm-lock.yaml ]]; then
  echo "→ pnpm workspace detected — add override manually if npm link fails:"
  echo '  "pnpm": { "overrides": { "dsh-tool-project-memory": "link:'"$OPH_PKG"'" } }'
fi
npm link dsh-tool-project-memory 2>/dev/null || true

node -e "import('dsh-tool-project-memory').then(m => console.log('OK plugin:', m.name))" \
  || echo "WARN: import check failed — complete peer link per docs/harness-integration.md"

echo "Done. Append examples/harness-plugin.cordis.patch.yml to your profile cordis.patch.yml"
