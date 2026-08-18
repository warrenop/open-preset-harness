#!/usr/bin/env bash
# Ensure GitHub labels used by issue templates exist.
set -euo pipefail
REPO="${1:-warrenop/open-preset-harness}"

create_label() {
  local name="$1"
  local color="$2"
  local description="$3"
  if gh label list --repo "$REPO" --json name --jq ".[].name" 2>/dev/null | rg -qx "$name"; then
    echo "label exists: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description" \
      || gh label create "$name" --repo "$REPO" --color "$color" --force
    echo "created label: $name"
  fi
}

create_label scenario 1d76db "Real-world workflow for market-fit testing"
create_label bug d73a4a "Something broken"
create_label enhancement a2eeef "Feature request"
create_label idea fef2c0 "Early idea or architecture discussion"
create_label question fbca04 "Q&A"
