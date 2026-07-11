#!/usr/bin/env bash
set -euo pipefail

# Verifies all GitHub Actions in workflow files are pinned to immutable SHA refs.
# Fails if any action uses a moving tag (v4, main, master, latest).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_DIR="$ROOT_DIR/.github/workflows"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "No .github/workflows directory found." >&2
  exit 1
fi

# Pattern: uses: <owner>/<repo>@<ref> where ref is a moving tag
MOVING_REF_PATTERN='uses:[[:space:]]+[^#[[:space:]]+@[^[:space:]]*@(v[0-9]+|main|master|latest|nightly)'

TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT

set +e
grep -rInE "$MOVING_REF_PATTERN" "$WORKFLOW_DIR" > "$TMP_OUT" 2>/dev/null
status=$?
set -e

if [ -s "$TMP_OUT" ]; then
  echo "ERROR: Unpinned GitHub Actions detected:" >&2
  cat "$TMP_OUT" >&2
  echo "" >&2
  echo "All actions must be pinned to full 40-char commit SHA." >&2
  echo "Example: uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4" >&2
  exit 1
fi

echo "All GitHub Actions are pinned to immutable SHA."
