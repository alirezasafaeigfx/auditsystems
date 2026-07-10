#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "Secret scan requires ripgrep (rg)." >&2
  exit 2
fi

TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT

PATTERN='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----|(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*["'"'"'`][^"'"'"'`]{8,}["'"'"'`])'

if rg -n --hidden \
  --glob '!.git/**' \
  --glob '!node_modules/**' \
  --glob '!.next/**' \
  --glob '!coverage/**' \
  --glob '!artifacts/**' \
  --glob '!reports/**' \
  --glob '!logs/**' \
  --glob '!docs/**' \
  --glob '!README.md' \
  --glob '!src/**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.spec.tsx' \
  -P "$PATTERN" . >"$TMP_OUT"; then
  echo "Potential secrets detected:"
  cat "$TMP_OUT"
  exit 1
fi

echo "Secret scan passed."
