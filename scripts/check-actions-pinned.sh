#!/usr/bin/env bash
set -euo pipefail

# Verifies all GitHub Actions in workflow files are pinned to immutable 40-char SHA refs.
# Positively confirms every `uses:` line ends with @[0-9a-f]{40}.
# Fails if any action uses a moving tag, branch ref, or short SHA.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_DIR="$ROOT_DIR/.github/workflows"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "No .github/workflows directory found." >&2
  exit 1
fi

# Match all `uses:` lines that reference external actions (contain `/` and `@`)
# and check if the ref after @ is NOT a 40-char hex SHA.
# SHA pattern: exactly 40 hex chars at end of line (optionally followed by space + comment)
UNPINNED_PATTERN='uses:[[:space:]]+[^#[[:space:]]*@[[:space:]]*([^#[:space:]]+)'

TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT

set +e
grep -rInE "$UNPINNED_PATTERN" "$WORKFLOW_DIR" > "$TMP_OUT" 2>/dev/null
status=$?
set -e

if [ "$status" -gt 1 ]; then
  echo "ERROR: grep execution failed with exit code $status." >&2
  exit "$status"
fi

if [ ! -s "$TMP_OUT" ]; then
  echo "All GitHub Actions are pinned to immutable SHA."
  exit 0
fi

# Filter: only external actions (contain `/` in the action name)
# and check if the ref is a valid 40-char SHA
FAIL=0
while IFS= read -r line; do
  # Extract the action ref (everything after the last @ before any comment or space)
  ref=$(echo "$line" | sed -n 's/.*@\([^ #]*\).*/\1/p')
  # Check if ref matches exactly 40 hex chars
  if ! echo "$ref" | grep -qE '^[0-9a-fA-F]{40}$'; then
    echo "UNPINNED: $line" >&2
    FAIL=1
  fi
done < "$TMP_OUT"

if [ "$FAIL" -eq 1 ]; then
  echo "" >&2
  echo "All actions must be pinned to full 40-char commit SHA." >&2
  echo "Example: uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4" >&2
  exit 1
fi

echo "All GitHub Actions are pinned to immutable SHA."
