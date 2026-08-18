#!/usr/bin/env bash
# Run Part A (remember) and Part B (recall) from demo-walkthrough via headless profile.
# Requires live LLM credentials (DEEPSEEK_API_KEY or ~/.dsh/.credentials.yaml).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="${HARNESS:-$ROOT/../deepseek-harness-master}"
DEMO="$ROOT/examples/demo-project"
PATCH="${PATCH:-$ROOT/examples/harness-plugin.patch.yml}"
PART="${PART:-both}" # both | a | b
PROFILE="${PROFILE:-headless}"

usage() {
  cat <<'EOF'
Usage: scripts/demo-headless.sh [options]

Runs the dual-session headless demo (Part A write, Part B recall).
Each part is a new headless session in examples/demo-project (process cwd).

Options:
  --part-a        Part A only (remember security + engineering)
  --part-b        Part B only (recall; uses existing .dsh/memory/)
  --fresh         Remove demo .dsh/memory before Part A
  --harness PATH  DeepSeek Harness checkout (default: ../deepseek-harness-master)
  --profile NAME  Harness profile (default: headless)
  --patch PATH    Plugin cordis patch overlay (default: examples/harness-plugin.patch.yml)
  -h, --help      Show this help

Environment:
  DEEPSEEK_API_KEY   Live LLM calls (or configure ~/.dsh/.credentials.yaml)
  HARNESS, PROFILE, PATCH

Prerequisites:
  - Harness built (pnpm install && pnpm run build in Harness repo)
  - Plugin linked: scripts/install-harness-link.sh
EOF
}

FRESH=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --part-a) PART=a; shift ;;
    --part-b) PART=b; shift ;;
    --fresh) FRESH=1; shift ;;
    --harness) HARNESS="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --patch) PATCH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "${DEEPSEEK_API_KEY:-}" && ! -f "${HOME}/.dsh/.credentials.yaml" ]]; then
  echo "ERROR: set DEEPSEEK_API_KEY or configure ~/.dsh/.credentials.yaml" >&2
  exit 1
fi

HARNESS="$(cd "$HARNESS" && pwd)"
DEMO="$(cd "$DEMO" && pwd)"
PATCH="$(cd "$(dirname "$PATCH")" && pwd)/$(basename "$PATCH")"

TEMP_PATCH="$(mktemp "${TMPDIR:-/tmp}/oph-demo-patch.XXXXXX.yml")"
cleanup() { rm -f "$TEMP_PATCH"; }
trap cleanup EXIT

cat > "$TEMP_PATCH" <<EOF
- insert:
    - id: dsh-tool-project-memory
      name: '@open-preset-harness/dsh-tool-project-memory/plugin'
      config:
        projectRoot: "$DEMO"
        indexInjectMaxBytes: 4096
        recallMaxBytes: 32768
        rememberMaxBodyBytes: 16384
        maxDomains: 64
        readOnly: false
        writeDenyDomains: []
EOF

if [[ ! -f "$HARNESS/package.json" ]]; then
  echo "ERROR: Harness checkout not found at $HARNESS" >&2
  exit 1
fi

if [[ ! -d "$HARNESS/node_modules" ]]; then
  echo "ERROR: Run pnpm install in $HARNESS first." >&2
  exit 1
fi

if [[ ! -f "$PATCH" ]]; then
  echo "ERROR: Patch file not found: $PATCH" >&2
  exit 1
fi

PROFILE_DIR="${HOME}/.dsh/profiles/${PROFILE}"
PLUGIN_PKG="$ROOT/packages/tool-project-memory"
PROFILE_PLUGIN="$PROFILE_DIR/node_modules/@open-preset-harness/dsh-tool-project-memory"
mkdir -p "$PROFILE_DIR/node_modules/@open-preset-harness"
if [[ ! -e "$PROFILE_PLUGIN" ]]; then
  echo "→ linking plugin into $PROFILE profile"
  ln -sfn "$PLUGIN_PKG" "$PROFILE_PLUGIN"
fi

cd "$DEMO"
if [[ ! -d .git ]]; then
  echo "→ git init in $DEMO"
  git init -q
fi

if [[ "$FRESH" -eq 1 && "$PART" != b ]]; then
  echo "→ removing existing .dsh/memory"
  rm -rf .dsh/memory
fi

run_dsh() {
  local label="$1"
  local prompt="$2"
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo " $label"
  echo " profile: $PROFILE"
  echo " cwd:     $DEMO"
  echo "════════════════════════════════════════════════════════════"
  (
    cd "$HARNESS"
    if command -v pnpm >/dev/null 2>&1; then
      pnpm dsh --profile "$PROFILE" --patch "$TEMP_PATCH" "$prompt"
    else
      npm run dsh -- --profile "$PROFILE" --patch "$TEMP_PATCH" "$prompt"
    fi
  )
}

PART_A_PROMPT='1. 调用 memory_status
2. remember 写入 security 域：Admin routes require step-up MFA since audit（正文写 requireStepUp、禁止 localStorage 存 refresh token）
3. remember 写入 engineering 域：Public API pagination uses opaque cursors only
4. 再 memory_status 确认 entry_count >= 2'

PART_B_PROMPT='你要做 admin dashboard API，你没参加过安全评审。
1. memory_status
2. recall domain security — admin 有什么约束？
3. recall domain engineering — 分页规则？
4. 用一段话总结，不要再用其他工具。'

case "$PART" in
  both)
    echo "→ Part A: write memory (new session)"
    run_dsh "Part A" "$PART_A_PROMPT"
    echo ""
    echo "→ disk after Part A:"
    ls -la .dsh/memory/ 2>/dev/null || echo "  (no .dsh/memory yet)"
    echo ""
    echo "→ Part B: recall memory (new session)"
    run_dsh "Part B" "$PART_B_PROMPT"
    ;;
  a)
    echo "→ Part A only"
    run_dsh "Part A" "$PART_A_PROMPT"
    ;;
  b)
    echo "→ Part B only (expects .dsh/memory/ from Part A or repo seed)"
    run_dsh "Part B" "$PART_B_PROMPT"
    ;;
  *)
    echo "ERROR: invalid PART=$PART" >&2
    exit 1
    ;;
esac

echo ""
echo "Done. Inspect memory:"
echo "  ls $DEMO/.dsh/memory/"
echo "  cat $DEMO/.dsh/memory/index.md"
