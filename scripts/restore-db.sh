#!/bin/bash
# Restore script for AuditSystems PostgreSQL database
# Usage: ./restore-db.sh [backup-file.sql.gz] [--dry-run] [--force]
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE="${PROJECT_DIR}/ops/backups"
DRY_RUN=false
FORCE=false
BACKUP_FILE=""

# shellcheck source=scripts/lib/postgres-connection.sh
source "$SCRIPT_DIR/lib/postgres-connection.sh"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force|-f) FORCE=true ;;
    *.sql.gz|*.dump) BACKUP_FILE="$arg" ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: ./restore-db.sh [backup-file.sql.gz] [--dry-run] [--force]"
      exit 1
      ;;
  esac
done

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

die() {
  log "FATAL: $1"
  exit 1
}

if [[ -z "$BACKUP_FILE" ]]; then
  BACKUP_FILE="$(ls -t "${BACKUP_BASE}"/asdev-audit-*.sql.gz 2>/dev/null | head -1 || true)"
  [[ -n "$BACKUP_FILE" ]] || die "No backups found in ${BACKUP_BASE}/"
  log "No backup specified, using latest: $(basename "$BACKUP_FILE")"
fi

[[ -f "$BACKUP_FILE" ]] || die "Backup file not found: ${BACKUP_FILE}"

BACKUP_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
BACKUP_FILENAME="$(basename "$BACKUP_FILE")"
BACKUP_SHA256="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"

resolve_postgres_connection || die "Unable to resolve PostgreSQL connection settings"
if [[ -n "${DATABASE_URL:-}" ]]; then
  log "Using complete target parsed from DATABASE_URL"
else
  log "Using explicit POSTGRES_* connection settings"
fi
log "Resolved target: $POSTGRES_TARGET_DISPLAY"

command -v psql >/dev/null 2>&1 || die "psql not found. Install postgresql-client."
command -v pg_isready >/dev/null 2>&1 || die "pg_isready not found. Install postgresql-client."
command -v pg_restore >/dev/null 2>&1 || die "pg_restore not found. Install postgresql-client."

run_psql() {
  run_postgres_command psql "$@"
}

run_pg_isready() {
  run_postgres_command pg_isready "$@"
}

run_pg_restore() {
  run_postgres_command pg_restore "$@"
}

log "========================================="
log "Pre-restore verification"
log "  File: ${BACKUP_FILENAME}"
log "  Size: ${BACKUP_SIZE}"
log "  SHA-256: ${BACKUP_SHA256}"
log "  Target: ${POSTGRES_TARGET_DISPLAY}"

if [[ "$BACKUP_FILENAME" == *.gz ]]; then
  log "  Checking gzip integrity..."
  gzip -t "$BACKUP_FILE" 2>/dev/null || die "Backup file failed gzip integrity check. File may be corrupted."
  log "  Gzip integrity: OK"

  log "  Checking SQL content..."
  if ! zcat "$BACKUP_FILE" | head -5 | grep -qiE '(PostgreSQL|CREATE|SET)'; then
    log "  WARNING: First 5 lines do not look like a PostgreSQL dump."
    log "  Continuing, but verify the file manually if restore fails."
  else
    log "  SQL content: OK"
  fi
else
  log "  Checking dump file header..."
  run_pg_restore -l "$BACKUP_FILE" >/dev/null 2>&1 || die "Backup file is not a valid pg_restore dump."
  log "  Dump format: OK"
fi

if [[ "$FORCE" == false && "$DRY_RUN" == false ]]; then
  echo
  echo "WARNING: This will OVERWRITE the configured target database."
  echo "  Target: ${POSTGRES_TARGET_DISPLAY}"
  echo "  Backup: ${BACKUP_FILENAME} (${BACKUP_SIZE})"
  echo "  SHA-256: ${BACKUP_SHA256}"
  echo
  read -r -p "Type 'RESTORE' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "RESTORE" ]]; then
    log "Aborted by user."
    exit 0
  fi
fi

if $DRY_RUN; then
  log "DRY RUN: Would restore ${BACKUP_FILENAME} to ${POSTGRES_TARGET_DISPLAY}"
  log "DRY RUN: Would run post-restore health checks"
  log "DRY RUN complete. No changes made."
  exit 0
fi

log "========================================="
log "Starting restore..."

log "  Pre-restore health check..."
if run_pg_isready >/dev/null 2>&1; then
  log "  Database is currently accessible"
else
  log "  WARNING: Database is not responding. Attempting restore anyway..."
fi

if [[ "$BACKUP_FILENAME" == *.gz ]]; then
  log "  Decompressing and restoring..."
  if ! zcat "$BACKUP_FILE" | run_psql \
    --set ON_ERROR_STOP=1 \
    --single-transaction \
    2>&1 | tail -20; then
    die "Restore failed. The database may be in an inconsistent state."
  fi
else
  log "  Restoring from custom dump format..."
  if ! run_pg_restore \
    --dbname "$POSTGRES_DATABASE" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    "$BACKUP_FILE" 2>&1 | tail -20; then
    die "pg_restore failed. The target database may be inconsistent."
  fi
fi

log "  Restore command completed"
log "========================================="
log "Post-restore health check..."

HEALTH_OK=true
TABLE_COUNT="$(run_psql -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')"
if [[ -n "$TABLE_COUNT" && "$TABLE_COUNT" -gt 0 ]]; then
  log "  Tables found: ${TABLE_COUNT}"
else
  log "  WARNING: No tables found in public schema"
  HEALTH_OK=false
fi

for tbl in "User" "AuditRun" "AuditLead" "Subscription"; do
  COUNT="$(run_psql -t -c "SELECT count(*) FROM \"${tbl}\";" 2>/dev/null | tr -d ' ' || echo "N/A")"
  log "  ${tbl}: ${COUNT} rows"
  [[ "$COUNT" != "N/A" ]] || HEALTH_OK=false
done

if run_pg_isready >/dev/null 2>&1; then
  log "  Connectivity: OK"
else
  log "  WARNING: Database not responding to pg_isready"
  HEALTH_OK=false
fi

log "========================================="
if $HEALTH_OK; then
  log "Restore completed successfully"
else
  log "Restore verification failed. Review health check output above."
  exit 1
fi
log "  Source: ${BACKUP_FILENAME}"
log "  Target: ${POSTGRES_TARGET_DISPLAY}"
