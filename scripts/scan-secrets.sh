#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PATTERN='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----|(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*["'"'"'`][^"'"'"'`]{8,}["'"'"'`])'

EXCLUDES=(
  '!.git/**'
  '!node_modules/**'
  '!.next/**'
  '!coverage/**'
  '!artifacts/**'
  '!reports/**'
  '!logs/**'
  '!docs/**'
  '!README.md'
  '!src/**/__tests__/**'
  '!**/*.test.ts'
  '!**/*.test.tsx'
  '!**/*.spec.ts'
  '!**/*.spec.tsx'
  '!vitest.setup.ts'
  '!src/scripts/smoke-*'
  '!scripts/backup-db.sh'
  '!scripts/restore-db.sh'
  '!.github/workflows/*.yml'
)

TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT

run_scan() {
  if command -v rg >/dev/null 2>&1; then
    local rg_args=(-n --hidden)
    for g in "${EXCLUDES[@]}"; do
      rg_args+=(--glob "$g")
    done
    rg "${rg_args[@]}" -P "$PATTERN" . >"$TMP_OUT" 2>/dev/null || true
  elif command -v grep >/dev/null 2>&1; then
    local exclude_args=()
    for g in "${EXCLUDES[@]}"; do
      local raw="${g#!}"
      raw="${raw%/**}"
      exclude_args+=(--exclude-dir="$raw")
    done
    grep -rnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.json' --include='*.yml' --include='*.yaml' --include='*.env' --include='*.sh' --include='*.md' --include='*.cjs' --include='*.mjs' "${exclude_args[@]}" "$PATTERN" . >"$TMP_OUT" 2>/dev/null || true
  else
    echo "Neither ripgrep (rg) nor grep is available." >&2
    exit 1
  fi
}

run_scan

if [ -s "$TMP_OUT" ]; then
  echo "Potential secrets detected:"
  cat "$TMP_OUT"
  exit 1
fi

echo "Secret scan passed."
