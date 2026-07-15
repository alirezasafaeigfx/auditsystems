#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

PROJECT="$TMP_ROOT/project"
TEST_BIN="$TMP_ROOT/bin"
mkdir -p "$PROJECT/scripts" "$PROJECT/ops/deploy" "$TEST_BIN"
cp "$REPO_ROOT/backup-db.sh" "$PROJECT/scripts/backup-db.sh"
cp "$REPO_ROOT/restore-db.sh" "$PROJECT/scripts/restore-db.sh"
cp "$REPO_ROOT/deploy.sh" "$PROJECT/ops/deploy/deploy.sh"

cat > "$TEST_BIN/pg_dump" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$ASDEV_TEST_TMP/pg-dump.args"
printf '%s\n' '-- PostgreSQL database dump'
for i in {1..40}; do printf 'CREATE TABLE "T%s" (id integer);\n' "$i"; done
STUB

cat > "$TEST_BIN/pg_isready" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" >> "$ASDEV_TEST_TMP/pg-isready.args"
STUB

cat > "$TEST_BIN/psql" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" >> "$ASDEV_TEST_TMP/psql.args"
if [[ " $* " == *" -c "* ]]; then
  printf ' 10\n'
else
  consume="$(mktemp)"
  trap 'rm -f "$consume"' EXIT
  cp /dev/stdin "$consume"
fi
STUB

cat > "$TEST_BIN/pg_restore" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$ASDEV_TEST_TMP/pg-restore.args"
STUB

chmod +x "$TEST_BIN/pg_dump" "$TEST_BIN/pg_isready" "$TEST_BIN/psql" "$TEST_BIN/pg_restore"

CANARY_URL='postgresql://release_test@db.invalid:5432/audit_release_test'
export ASDEV_TEST_TMP="$TMP_ROOT"

bash -n "$PROJECT/scripts/backup-db.sh" "$PROJECT/scripts/restore-db.sh" "$PROJECT/ops/deploy/deploy.sh"

set +e
PATH="$TEST_BIN:$PATH" env -u DATABASE_URL -u POSTGRES_HOST -u POSTGRES_DB -u POSTGRES_USER \
  bash "$PROJECT/scripts/backup-db.sh" --dry-run >"$TMP_ROOT/missing-env.log" 2>&1
missing_env_rc=$?
set -e
if [[ "$missing_env_rc" -eq 0 ]]; then
  echo "expected missing connection settings to fail" >&2
  exit 1
fi

PATH="$TEST_BIN:$PATH" DATABASE_URL="$CANARY_URL" \
  bash "$PROJECT/scripts/backup-db.sh" >"$TMP_ROOT/backup.log"
backup_file="$(find "$PROJECT/ops/backups" -maxdepth 1 -name 'asdev-audit-*.sql.gz' -type f -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
test -n "$backup_file"
gzip -t "$backup_file"
grep -Fx -- "$CANARY_URL" "$TMP_ROOT/pg-dump.args" >/dev/null
grep -Fx -- '--clean' "$TMP_ROOT/pg-dump.args" >/dev/null
grep -Fx -- '--if-exists' "$TMP_ROOT/pg-dump.args" >/dev/null

PATH="$TEST_BIN:$PATH" DATABASE_URL="$CANARY_URL" \
  bash "$PROJECT/scripts/restore-db.sh" "$backup_file" --force >"$TMP_ROOT/restore.log"
grep -Fx -- "--dbname=$CANARY_URL" "$TMP_ROOT/psql.args" >/dev/null
grep -Fx -- '--single-transaction' "$TMP_ROOT/psql.args" >/dev/null
grep -Fx -- "--dbname=$CANARY_URL" "$TMP_ROOT/pg-isready.args" >/dev/null

build_line="$(grep -n '^pnpm run build$' "$PROJECT/ops/deploy/deploy.sh" | cut -d: -f1)"
migrate_line="$(grep -n '^pnpm prisma migrate deploy$' "$PROJECT/ops/deploy/deploy.sh" | cut -d: -f1)"
if [[ -z "$build_line" || -z "$migrate_line" || "$build_line" -ge "$migrate_line" ]]; then
  echo "build must occur before migration" >&2
  exit 1
fi

echo "release safety fixtures: PASS"
