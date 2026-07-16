#!/usr/bin/env bash
# CI guard: prevent database dumps and backup artifacts from entering Git.
set -euo pipefail

is_allowed_migration() {
  local path="$1"
  [[ "$path" =~ ^prisma/migrations/[^/]+/migration\.sql$ ]]
}

is_database_artifact() {
  local path="$1"
  case "$path" in
    ops/backups/*|*.sql|*.sql.gz|*.sql.bz2|*.dump|*.dump.gz|*.backup)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

violations=()
while IFS= read -r -d '' path; do
  if is_allowed_migration "$path"; then
    continue
  fi
  if is_database_artifact "$path"; then
    violations+=("$path")
  fi
done < <(git ls-files -z)

if (( ${#violations[@]} > 0 )); then
  echo "FATAL: tracked database dump or backup artifact detected:" >&2
  printf '  - %s\n' "${violations[@]}" >&2
  echo "Only prisma/migrations/<migration-id>/migration.sql is allowed." >&2
  exit 1
fi

echo "Tracked database dump guard: PASS"
