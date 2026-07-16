#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

new_repo() {
  local name="$1"
  local repo="$TMP_ROOT/$name"
  mkdir -p "$repo/scripts"
  cp "$REPO_ROOT/scripts/check-no-database-dumps.sh" "$repo/scripts/"
  git -C "$repo" init -q
  git -C "$repo" config user.email "release-safety@example.invalid"
  git -C "$repo" config user.name "Release Safety"
  printf '%s\n' "$repo"
}

track() {
  local repo="$1"
  local path="$2"
  mkdir -p "$(dirname "$repo/$path")"
  printf '%s\n' "fixture" > "$repo/$path"
  git -C "$repo" add "$path"
}

expect_pass() {
  local repo="$1"
  (cd "$repo" && bash scripts/check-no-database-dumps.sh) >/dev/null
}

expect_fail_with() {
  local repo="$1"
  local expected="$2"
  local output="$TMP_ROOT/guard-failure.log"
  if (cd "$repo" && bash scripts/check-no-database-dumps.sh) >"$output" 2>&1; then
    echo "expected database dump guard to fail for $expected" >&2
    exit 1
  fi
  grep -F -- "$expected" "$output" >/dev/null
}

# Exact Prisma migrations are the only tracked SQL files that are allowed.
repo="$(new_repo allowed-migration)"
track "$repo" "prisma/migrations/202607160001_init/migration.sql"
track "$repo" "docs/database-notes.md"
expect_pass "$repo"

# Regression: a legitimate migration must not hide an unrelated production dump.
repo="$(new_repo mixed-migration-and-dump)"
track "$repo" "prisma/migrations/202607160002_add_index/migration.sql"
track "$repo" "prod.sql"
expect_fail_with "$repo" "prod.sql"

# SQL under the migration tree is rejected unless it is the exact migration file.
repo="$(new_repo noncanonical-migration-sql)"
track "$repo" "prisma/migrations/202607160003_seed/seed.sql"
expect_fail_with "$repo" "prisma/migrations/202607160003_seed/seed.sql"

repo="$(new_repo nested-migration-sql)"
track "$repo" "prisma/migrations/202607160004_nested/nested/migration.sql"
expect_fail_with "$repo" "prisma/migrations/202607160004_nested/nested/migration.sql"

# Every supported dump/backup extension and every tracked ops/backups path fails.
for path in \
  "database.sql.gz" \
  "database.sql.bz2" \
  "database.dump" \
  "database.dump.gz" \
  "database.backup" \
  "ops/backups/nested/rehearsal.bin"; do
  name="$(printf '%s' "$path" | tr '/.' '__')"
  repo="$(new_repo "blocked-$name")"
  track "$repo" "$path"
  expect_fail_with "$repo" "$path"
done

echo "database dump guard fixtures: PASS"
