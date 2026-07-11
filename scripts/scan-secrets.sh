#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ─── Pattern definitions ──────────────────────────────────────────
# PCRE pattern (for rg -P)
PCRE_PATTERN='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----|(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*["'"'"'`][^"'"'"'`]{8,}["'"'"'`])'

# ERE pattern (for grep -Ei) — no (?i), use -i flag
ERE_PATTERN='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----|(api[_-]?key|token|secret|password)[[:space:]]*[:=][[:space:]]*["'"'"'`][^"'"'"'`]{8,}["'"'"'`])'

# ─── Engine selection ─────────────────────────────────────────────
SECRET_SCAN_ENGINE="${SECRET_SCAN_ENGINE:-auto}"

TMP_OUT="$(mktemp)"
TMP_ERR="$(mktemp)"
trap 'rm -f "$TMP_OUT" "$TMP_ERR"' EXIT

run_rg() {
  local rg_args=(-n --hidden)
  rg_args+=(--glob '!.git/**')
  rg_args+=(--glob '!node_modules/**')
  rg_args+=(--glob '!.next/**')
  rg_args+=(--glob '!coverage/**')
  rg_args+=(--glob '!artifacts/**')
  rg_args+=(--glob '!reports/**')
  rg_args+=(--glob '!logs/**')
  rg_args+=(--glob '!docs/**')
  rg_args+=(--glob '!README.md')
  rg_args+=(--glob '!src/**/__tests__/**')
  rg_args+=(--glob '!**/*.test.ts')
  rg_args+=(--glob '!**/*.test.tsx')
  rg_args+=(--glob '!**/*.spec.ts')
  rg_args+=(--glob '!**/*.spec.tsx')
  rg_args+=(--glob '!vitest.setup.ts')
  rg_args+=(--glob '!src/scripts/smoke-*')
  rg_args+=(--glob '!scripts/backup-db.sh')
  rg_args+=(--glob '!scripts/restore-db.sh')
  rg_args+=(--glob '!scripts/test-scan-secrets.sh')
  rg_args+=(--glob '!.github/workflows/*.yml')

  set +e
  rg "${rg_args[@]}" -P "$PCRE_PATTERN" . >"$TMP_OUT" 2>"$TMP_ERR"
  local status=$?
  set -e

  case "$status" in
    0) return 0 ;;
    1) return 1 ;;
    *)
      echo "Secret scanner (rg) execution failed with exit code $status." >&2
      cat "$TMP_ERR" >&2
      exit "$status"
      ;;
  esac
}

run_grep() {
  set +e
  grep -riEn \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    --include='*.json' --include='*.yml' --include='*.yaml' --include='*.env' \
    --include='*.sh' --include='*.md' --include='*.cjs' --include='*.mjs' \
    --exclude-dir='.git' \
    --exclude-dir='node_modules' \
    --exclude-dir='.next' \
    --exclude-dir='coverage' \
    --exclude-dir='artifacts' \
    --exclude-dir='reports' \
    --exclude-dir='logs' \
    --exclude-dir='docs' \
    --exclude-dir='.github' \
    --exclude='*.test.ts' \
    --exclude='*.test.tsx' \
    --exclude='*.spec.ts' \
    --exclude='*.spec.tsx' \
    --exclude='vitest.setup.ts' \
    --exclude='README.md' \
    --exclude='backup-db.sh' \
    --exclude='restore-db.sh' \
    --exclude='smoke-*.ts' \
    --exclude='test-scan-secrets.sh' \
    "$ERE_PATTERN" . >"$TMP_OUT" 2>"$TMP_ERR"
  local status=$?
  set -e

  case "$status" in
    0) return 0 ;;
    1) return 1 ;;
    *)
      echo "Secret scanner (grep) execution failed with exit code $status." >&2
      cat "$TMP_ERR" >&2
      exit "$status"
      ;;
  esac
}

# ─── Dispatch ─────────────────────────────────────────────────────
scan_rc=0
case "$SECRET_SCAN_ENGINE" in
  auto)
    if command -v rg >/dev/null 2>&1; then
      engine="rg"
      run_rg || scan_rc=$?
    elif command -v grep >/dev/null 2>&1; then
      engine="grep"
      run_grep || scan_rc=$?
    else
      echo "Neither ripgrep (rg) nor grep is available." >&2
      exit 1
    fi
    ;;
  rg)
    if ! command -v rg >/dev/null 2>&1; then
      echo "SECRET_SCAN_ENGINE=rg but ripgrep (rg) is not installed." >&2
      exit 1
    fi
    engine="rg"
    run_rg || scan_rc=$?
    ;;
  grep)
    if ! command -v grep >/dev/null 2>&1; then
      echo "SECRET_SCAN_ENGINE=grep but grep is not installed." >&2
      exit 1
    fi
    engine="grep"
    run_grep || scan_rc=$?
    ;;
  *)
    echo "Invalid SECRET_SCAN_ENGINE value: '$SECRET_SCAN_ENGINE'. Must be auto, rg, or grep." >&2
    exit 1
    ;;
esac

# If the scanner itself failed (not just "no matches"), propagate the error
if [ "$scan_rc" -gt 1 ]; then
  exit "$scan_rc"
fi

if [ -s "$TMP_OUT" ]; then
  echo "Potential secrets detected (engine: $engine):"
  cat "$TMP_OUT"
  exit 1
fi

echo "Secret scan passed (engine: $engine)."
