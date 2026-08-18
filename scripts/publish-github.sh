#!/usr/bin/env bash
# One-shot: commit, create public GitHub repo, enable Discussions, seed first Scenario issue.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${GITHUB_USER:-warrenop}/open-preset-harness"

if [[ ! -d .git ]]; then
  git init
  git add -A
  git commit -m "Phase 0: project memory plugin, docs, and demo scaffolding."
fi

if ! git remote get-url origin &>/dev/null; then
  gh repo create "$REPO" --public --source=. --remote=origin --push
else
  git push -u origin HEAD
fi

gh api "repos/$REPO" -X PATCH -f has_discussions=true 2>/dev/null || true

gh issue create \
  --repo "$REPO" \
  --title "[scenario] SRE postmortem → debug preset (en-scenario)" \
  --label scenario \
  --body-file docs/github-first-scenario-issue.md

echo "Done: https://github.com/$REPO"
