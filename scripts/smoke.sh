#!/usr/bin/env bash
# Phase 0 smoke — no LLM. Core checks always; Harness integration when requested or detected.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/packages/tool-project-memory"
HARNESS="${HARNESS:-$ROOT/../deepseek-harness-master}"
PATCH="${PATCH:-$ROOT/examples/harness-plugin.cordis.patch.yml}"
WITH_HARNESS=0

usage() {
  cat <<'EOF'
Usage: scripts/smoke.sh [options]

Runs Phase 0 smoke checks without live LLM calls.

Options:
  --with-harness   Also link plugin into Harness and verify --dump-config patch
  --harness PATH   Harness checkout (default: ../deepseek-harness-master)
  --patch PATH     Cordis patch overlay (default: examples/harness-plugin.cordis.patch.yml)
  -h, --help       Show this help

Environment:
  HARNESS, PATCH

Core (always):
  - npm run check in packages/tool-project-memory
  - plugin export smoke (lib/plugin.js)
  - cordis.patch.yml sanity check

Harness (optional):
  - symlink plugin into Harness node_modules
  - dsh --dump-config includes dsh-tool-project-memory when patch applied
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-harness) WITH_HARNESS=1; shift ;;
    --harness) HARNESS="$2"; shift 2 ;;
    --patch) PATCH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ ! -d "$PKG" ]]; then
  echo "ERROR: package not found at $PKG" >&2
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo " smoke: core (packages/tool-project-memory)"
echo "════════════════════════════════════════════════════════════"

cd "$PKG"
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund
npm run check

echo "→ plugin export"
node --input-type=module -e "
  import * as plugin from './lib/plugin.js'
  if (plugin.name !== 'dsh-tool-project-memory') {
    throw new Error('unexpected plugin name: ' + plugin.name)
  }
  if (typeof plugin.apply !== 'function') {
    throw new Error('plugin.apply is not a function')
  }
  console.log('OK plugin export:', plugin.name)
"

echo "→ bundle patch"
PATCH_FILE="$PKG/cordis.patch.yml"
if ! grep -q 'dsh-tool-project-memory' "$PATCH_FILE"; then
  echo "ERROR: $PATCH_FILE missing dsh-tool-project-memory row" >&2
  exit 1
fi
echo "OK cordis.patch.yml"

if [[ "$WITH_HARNESS" -eq 0 && -d "$HARNESS" && -f "$HARNESS/package.json" ]]; then
  WITH_HARNESS=1
fi

if [[ "$WITH_HARNESS" -eq 0 ]]; then
  echo ""
  echo "Harness smoke skipped (no sibling checkout; use --with-harness to require it)."
  echo "Core smoke passed."
  exit 0
fi

HARNESS="$(cd "$HARNESS" && pwd)"
PATCH="$(cd "$(dirname "$PATCH")" && pwd)/$(basename "$PATCH")"

if [[ ! -f "$HARNESS/package.json" ]]; then
  echo "ERROR: Harness checkout not found at $HARNESS" >&2
  exit 1
fi

if [[ ! -f "$PATCH" ]]; then
  echo "ERROR: Patch file not found: $PATCH" >&2
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo " smoke: Harness integration"
echo " harness: $HARNESS"
echo " patch:   $PATCH"
echo "════════════════════════════════════════════════════════════"

"$ROOT/scripts/install-harness-link.sh" "$HARNESS"

if [[ ! -d "$HARNESS/node_modules" ]]; then
  echo "ERROR: Run pnpm install in $HARNESS first." >&2
  exit 1
fi

echo "→ dump-config with patch overlay"
DUMP="$(
  cd "$HARNESS"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm dsh --profile headless --patch "$PATCH" --dump-config 2>&1
  else
    npm run dsh -- --profile headless --patch "$PATCH" --dump-config 2>&1
  fi
)"

if ! printf '%s\n' "$DUMP" | grep -q 'dsh-tool-project-memory'; then
  echo "ERROR: dump-config output missing dsh-tool-project-memory" >&2
  printf '%s\n' "$DUMP" | tail -30 >&2
  exit 1
fi
echo "OK dump-config lists dsh-tool-project-memory"

echo ""
echo "Smoke passed (core + Harness integration)."
