#!/usr/bin/env bash
# check-screenshot.sh: Require screenshots in PR body when UI files changed.
#
# Exits 0 (pass) if:
#   - No UI files changed in this PR, OR
#   - PR body contains at least one image reference "![]("
#
# Exits 1 (fail) if:
#   - UI files changed AND no screenshot in PR body
#
# Usage (in CI):
#   GITHUB_EVENT_PATH=/path/to/event.json ./check-screenshot.sh

set -euo pipefail

PR_BODY=""
CHANGED_FILES=""

# ── Read PR body from GitHub event ───────────────────────────────────────────
if [[ -n "${GITHUB_EVENT_PATH:-}" && -f "$GITHUB_EVENT_PATH" ]]; then
  PR_BODY=$(python3 -c "
import json, sys
with open('$GITHUB_EVENT_PATH') as f:
    event = json.load(f)
pr = event.get('pull_request', {})
print(pr.get('body', '') or '')
" 2>/dev/null || echo "")
fi

# ── Get changed files via git diff ───────────────────────────────────────────
BASE_SHA="${GITHUB_BASE_REF:-main}"
if git rev-parse --verify "origin/$BASE_SHA" &>/dev/null 2>&1; then
  CHANGED_FILES=$(git diff --name-only "origin/$BASE_SHA"...HEAD 2>/dev/null || echo "")
elif [[ -n "${GITHUB_BASE_SHA:-}" ]]; then
  CHANGED_FILES=$(git diff --name-only "$GITHUB_BASE_SHA"...HEAD 2>/dev/null || echo "")
else
  CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
fi

# ── Check if any UI files changed ────────────────────────────────────────────
UI_CHANGED=false
while IFS= read -r file; do
  case "$file" in
    # Frontend UI files
    the-council/frontend/app/*.tsx|\
    the-council/frontend/app/**/*.tsx|\
    the-council/frontend/components/*.tsx|\
    the-council/frontend/components/**/*.tsx|\
    the-council/frontend/app/**/*.ts|\
    the-council/frontend/app/globals.css|\
    the-council/frontend/tailwind.config.ts)
      UI_CHANGED=true
      break
      ;;
  esac
done <<< "$CHANGED_FILES"

if [[ "$UI_CHANGED" == "false" ]]; then
  echo "[screenshot-check] No UI files changed. Passing."
  exit 0
fi

echo "[screenshot-check] UI files changed. Checking for screenshots in PR body..."

# ── Check for screenshot in PR body ──────────────────────────────────────────
if echo "$PR_BODY" | grep -q "!\["; then
  echo "[screenshot-check] Screenshot found in PR body. Passing."
  exit 0
fi

echo "[screenshot-check] FAIL: UI files changed but no screenshot found in PR body."
echo ""
echo "Please add a screenshot to the PR description using:"
echo "  ![description](image-url-or-attachment)"
echo ""
echo "Changed UI files:"
echo "$CHANGED_FILES" | grep -E "\.(tsx|ts|css)$" | head -10
exit 1
