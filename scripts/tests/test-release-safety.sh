#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

PROJECT="$TMP_ROOT/project"
TEST_BIN="$TMP_ROOT/bin"
mkdir -p "$PROJECT/scripts/lib" "$PROJECT/ops/deploy" "$TEST_BIN"
cp "$REPO_ROOT/scripts/backup-db.sh" "$PROJECT/scripts/backup-db.sh"
cp "$REPO_ROOT/scripts/restore-db.sh" "$PROJECT/scripts/restore-db.sh"
cp "$REPO_ROOT/scripts/lib/postgres-connection.sh" "$PROJECT/scripts/lib/postgres-connection.sh"
cp "$REPO_ROOT/ops/deploy/deploy.sh" "$PROJECT/ops/deploy/deploy.sh"

cat > "$TEST_BIN/assert-target" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
[[ "${PGHOST:-}" == "${ASDEV_EXPECTED_PGHOST}" ]]
[[ "${PGPORT:-}" == "${ASDEV_EXPECTED_PGPORT}" ]]
[[ "${PGUSER:-}" == "${ASDEV_EXPECTED_PGUSER}" ]]
[[ "${PGDATABASE:-}" == "${ASDEV_EXPECTED_PGDATABASE}" ]]
[[ "${PGPASSWORD:-}" == "${ASDEV_EXPECTED_PG_CREDENTIAL}" ]]
[[ -z "${PGSERVICE+x}" ]]
[[ -z "${PGSERVICEFILE+x}" ]]
[[ "${PGSSLMODE:-}" == "${ASDEV_EXPECTED_PGSSLMODE}" ]]
[[ "${PGSSLROOTCERT:-}" == "${ASDEV_EXPECTED_PGSSLROOTCERT}" ]]
printf 'target-ok\n' >> "$ASDEV_TEST_TMP/target-checks"
STUB

cat > "$TEST_BIN/pg_dump" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
"$ASDEV_TEST_BIN/assert-target"
printf '%s\n' "$@" > "$ASDEV_TEST_TMP/pg-dump.args"
printf '%s\n' '-- PostgreSQL database dump'
for i in {1..40}; do printf 'CREATE TABLE "T%s" (id integer);\n' "$i"; done
STUB

cat > "$TEST_BIN/pg_isready" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
"$ASDEV_TEST_BIN/assert-target"
printf '%s\n' "$@" >> "$ASDEV_TEST_TMP/pg-isready.args"
STUB

cat > "$TEST_BIN/psql" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
"$ASDEV_TEST_BIN/assert-target"
printf '%s\n' "$@" >> "$ASDEV_TEST_TMP/psql.args"
if [[ " $* " == *" -c "* ]]; then
  if [[ "${ASDEV_TEST_ZERO_TABLES:-0}" == "1" ]]; then
    printf ' 0\n'
  else
    printf ' 10\n'
  fi
else
  consume="$(mktemp)"
  trap 'rm -f "$consume"' EXIT
  cp /dev/stdin "$consume"
fi
STUB

cat > "$TEST_BIN/pg_restore" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
"$ASDEV_TEST_BIN/assert-target"
printf '%s\n' "$@" > "$ASDEV_TEST_TMP/pg-restore.args"
STUB

chmod +x "$TEST_BIN"/*

CANARY_URL='postgresql://release%5Ftest:p%40ss%3Aword@[2001:db8::1]:6543/audit%5Frelease%5Ftest?schema=public&connection_limit=5&sslmode=require&sslrootcert=%2Ftmp%2Frelease-root.crt'
export ASDEV_TEST_TMP="$TMP_ROOT"
export ASDEV_TEST_BIN="$TEST_BIN"
export ASDEV_EXPECTED_PGHOST='2001:db8::1'
export ASDEV_EXPECTED_PGPORT='6543'
export ASDEV_EXPECTED_PGUSER='release_test'
export ASDEV_EXPECTED_PGDATABASE='audit_release_test'
export ASDEV_EXPECTED_PG_CREDENTIAL='p@ss:word'
export ASDEV_EXPECTED_PGSSLMODE='require'
export ASDEV_EXPECTED_PGSSLROOTCERT='/tmp/release-root.crt'
export PGSERVICE='hostile-service'
export PGSERVICEFILE='/tmp/hostile-pg-service.conf'

bash -n \
  "$PROJECT/scripts/lib/postgres-connection.sh" \
  "$PROJECT/scripts/backup-db.sh" \
  "$PROJECT/scripts/restore-db.sh" \
  "$PROJECT/ops/deploy/deploy.sh"

set +e
PATH="$TEST_BIN:$PATH" env \
  -u DATABASE_URL \
  -u POSTGRES_HOST \
  -u POSTGRES_DB \
  -u POSTGRES_USER \
  bash "$PROJECT/scripts/backup-db.sh" --dry-run >"$TMP_ROOT/missing-env.log" 2>&1
missing_env_rc=$?
set -e
if [[ "$missing_env_rc" -eq 0 ]]; then
  echo "expected missing connection settings to fail" >&2
  exit 1
fi

# A credential-bearing `env PGPASSWORD=...` wrapper would expose the password
# in process arguments. Database commands must be launched through shell
# exports instead, so make any external env invocation fail the fixture.
cat > "$TEST_BIN/env" <<'STUB'
#!/usr/bin/env bash
echo "unexpected external env wrapper" >&2
exit 97
STUB
chmod +x "$TEST_BIN/env"

PATH="$TEST_BIN:$PATH" DATABASE_URL="$CANARY_URL" \
  bash "$PROJECT/scripts/backup-db.sh" >"$TMP_ROOT/backup.log"
backup_file="$(find "$PROJECT/ops/backups" -maxdepth 1 -name 'asdev-audit-*.sql.gz' -type f -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
test -n "$backup_file"
gzip -t "$backup_file"
backup_mode="$(stat -c '%a' "$backup_file")"
if [[ "$backup_mode" != "600" ]]; then
  echo "backup permissions must be 0600, got $backup_mode" >&2
  exit 1
fi
grep -Fx -- '--clean' "$TMP_ROOT/pg-dump.args" >/dev/null
grep -Fx -- '--if-exists' "$TMP_ROOT/pg-dump.args" >/dev/null

PATH="$TEST_BIN:$PATH" DATABASE_URL="$CANARY_URL" \
  bash "$PROJECT/scripts/restore-db.sh" "$backup_file" --force >"$TMP_ROOT/restore.log"
grep -Fx -- '--single-transaction' "$TMP_ROOT/psql.args" >/dev/null
for table in User AuditRun AuditLead Subscription; do
  grep -F -- "SELECT count(*) FROM \"$table\";" "$TMP_ROOT/psql.args" >/dev/null
done
if grep -F -- 'SELECT count(*) FROM "AuditReport";' "$TMP_ROOT/psql.args" >/dev/null; then
  echo "restore verification referenced legacy table AuditReport" >&2
  exit 1
fi
test "$(wc -l < "$TMP_ROOT/target-checks")" -ge 6

# Custom-format archives must restore directly into the resolved database. Without
# --dbname, pg_restore only emits SQL to stdout and can falsely appear successful.
custom_dump="$TMP_ROOT/release-safety.dump"
printf 'PGDMP fixture\n' > "$custom_dump"
PATH="$TEST_BIN:$PATH" DATABASE_URL="$CANARY_URL" \
  bash "$PROJECT/scripts/restore-db.sh" "$custom_dump" --force >"$TMP_ROOT/restore-custom.log"
grep -Fx -- '--dbname' "$TMP_ROOT/pg-restore.args" >/dev/null
grep -Fx -- "$ASDEV_EXPECTED_PGDATABASE" "$TMP_ROOT/pg-restore.args" >/dev/null
grep -Fx -- "$custom_dump" "$TMP_ROOT/pg-restore.args" >/dev/null

# Connection secrets and the raw URL must never appear in command arguments or logs.
for output in \
  "$TMP_ROOT/pg-dump.args" \
  "$TMP_ROOT/pg-isready.args" \
  "$TMP_ROOT/psql.args" \
  "$TMP_ROOT/backup.log" \
  "$TMP_ROOT/restore.log" \
  "$TMP_ROOT/restore-custom.log"; do
  if grep -F -- "$CANARY_URL" "$output" >/dev/null || grep -F -- "$ASDEV_EXPECTED_PG_CREDENTIAL" "$output" >/dev/null; then
    echo "database credential leaked into $output" >&2
    exit 1
  fi
done

set +e
PATH="$TEST_BIN:$PATH" DATABASE_URL="$CANARY_URL" ASDEV_TEST_ZERO_TABLES=1 \
  bash "$PROJECT/scripts/restore-db.sh" "$backup_file" --force >"$TMP_ROOT/restore-zero-tables.log" 2>&1
zero_tables_rc=$?
set -e
if [[ "$zero_tables_rc" -eq 0 ]]; then
  echo "restore verification must fail when no public tables are present" >&2
  exit 1
fi

build_line="$(grep -n '^pnpm run build$' "$PROJECT/ops/deploy/deploy.sh" | cut -d: -f1)"
migrate_line="$(grep -n '^pnpm prisma migrate deploy$' "$PROJECT/ops/deploy/deploy.sh" | cut -d: -f1)"
if [[ -z "$build_line" || -z "$migrate_line" || "$build_line" -ge "$migrate_line" ]]; then
  echo "build must occur before migration" >&2
  exit 1
fi
grep -F -- 'rollback_failed_release' "$PROJECT/ops/deploy/deploy.sh" >/dev/null

echo "release safety fixtures: PASS"
