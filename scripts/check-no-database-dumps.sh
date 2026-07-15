#!/usr/bin/env bash
# CI guard: prevent database dumps from entering Git
set -euo pipefail

DUMP_PATTERNS=(
  "*.sql"
  "*.sql.gz"
  "*.sql.bz2"
  "*.dump"
  "*.dump.gz"
  "ops/backups/*"
)

EXCLUDE_PATTERNS=(
  "prisma/migrations/*"
)

violations=0
for pattern in "${DUMP_PATTERNS[@]}"; do
  files=$(git ls-files "$pattern" 2>/dev/null || true)
  if [[ -n "$files" ]]; then
    excluded=false
    for exclude in "${EXCLUDE_PATTERNS[@]}"; do
      if echo "$files" | grep -q "$exclude"; then
        excluded=true
        break
      fi
    done
    if [[ "$excluded" == "false" ]]; then
      echo "VIOLATION: Database dump pattern found in Git: $pattern"
      echo "$files"
      violations=$((violations + 1))
    fi
  fi
done

if [[ "$violations" -gt 0 ]]; then
  echo "FATAL: $violations database dump pattern(s) found in tracked files"
  exit 1
fi

echo "No database dumps found in tracked files: PASS"
