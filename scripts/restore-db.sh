#!/bin/bash
# Restore script for AuditSystems PostgreSQL database
# Usage: ./restore-db.sh [backup-file.sql.gz] [--dry-run]
#
# Features:
#   - Restore from latest backup or specific file
#   - Pre-restore verification
#   - Post-restore health check
#   - Safety confirmation prompt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE="${PROJECT_DIR}/ops/backups"
DRY_RUN=false
FORCE=false
BACKUP_FILE=""

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --force|-f) FORCE=true ;;
        *.sql.gz) BACKUP_FILE="$arg" ;;
        *.dump) BACKUP_FILE="$arg" ;;
        *) echo "Unknown argument: $arg"; echo "Usage: ./restore-db.sh [backup-file.sql.gz] [--dry-run] [--force]"; exit 1 ;;
    esac
done

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

die() {
    log "FATAL: $1"
    exit 1
}

# Find backup file
if [ -z "$BACKUP_FILE" ]; then
    BACKUP_FILE=$(ls -t "${BACKUP_BASE}"/asdev-audit-*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        die "No backups found in ${BACKUP_BASE}/"
    fi
    log "No backup specified, using latest: $(basename "$BACKUP_FILE")"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    die "Backup file not found: ${BACKUP_FILE}"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_FILENAME=$(basename "$BACKUP_FILE")

# Resolve the exact target database. Never silently restore into a local
# development database when production connection settings are missing.
DB_PASS="${POSTGRES_PASSWORD:-}"
DB_HOST_DISPLAY="<from DATABASE_URL>"
DB_PORT_DISPLAY="<from DATABASE_URL>"
DB_USER_DISPLAY="<from DATABASE_URL>"
DB_NAME_DISPLAY="<from DATABASE_URL>"
PSQL_ARGS=()
PG_ISREADY_ARGS=()
PG_RESTORE_ARGS=()
PGDATABASE_VALUE=""
USE_DATABASE_URL=false

if [ -n "${DATABASE_URL:-}" ]; then
    command -v node >/dev/null 2>&1 || die "node is required to normalize DATABASE_URL safely"
    PGDATABASE_VALUE="$(DATABASE_URL="$DATABASE_URL" node -e '
      const url = new URL(process.env.DATABASE_URL);
      for (const key of ["schema", "connection_limit", "pool_timeout", "pgbouncer"]) {
        url.searchParams.delete(key);
      }
      process.stdout.write(url.pathname.slice(1));
    ')"
    USE_DATABASE_URL=true
    log "Using DATABASE_URL from environment"
elif [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ] && [ -n "${POSTGRES_USER:-}" ]; then
    DB_HOST_DISPLAY="$POSTGRES_HOST"
    DB_PORT_DISPLAY="${POSTGRES_PORT:-5432}"
    DB_USER_DISPLAY="$POSTGRES_USER"
    DB_NAME_DISPLAY="$POSTGRES_DB"
    PSQL_ARGS=(-h "$DB_HOST_DISPLAY" -p "$DB_PORT_DISPLAY" -U "$DB_USER_DISPLAY" -d "$DB_NAME_DISPLAY")
    PG_ISREADY_ARGS=(-h "$DB_HOST_DISPLAY" -p "$DB_PORT_DISPLAY" -U "$DB_USER_DISPLAY" -d "$DB_NAME_DISPLAY")
    PG_RESTORE_ARGS=(-h "$DB_HOST_DISPLAY" -p "$DB_PORT_DISPLAY" -U "$DB_USER_DISPLAY" -d "$DB_NAME_DISPLAY")
    log "Using explicit POSTGRES_* connection settings"
else
    die "DATABASE_URL or POSTGRES_HOST, POSTGRES_DB, and POSTGRES_USER must be set"
fi

run_psql() {
    if $USE_DATABASE_URL; then
        PGDATABASE="$PGDATABASE_VALUE" PGPASSWORD="" psql "$@"
    else
        PGPASSWORD="$DB_PASS" psql "${PSQL_ARGS[@]}" "$@"
    fi
}

run_pg_isready() {
    if $USE_DATABASE_URL; then
        PGDATABASE="$PGDATABASE_VALUE" PGPASSWORD="" pg_isready "$@"
    else
        PGPASSWORD="$DB_PASS" pg_isready "${PG_ISREADY_ARGS[@]}" "$@"
    fi
}

run_pg_restore() {
    if $USE_DATABASE_URL; then
        PGDATABASE="$PGDATABASE_VALUE" PGPASSWORD="" pg_restore "$@"
    else
        PGPASSWORD="$DB_PASS" pg_restore "${PG_RESTORE_ARGS[@]}" "$@"
    fi
}

# Pre-restore verification
log "========================================="
log "Pre-restore verification"
log "  File: ${BACKUP_FILENAME}"
log "  Size: ${BACKUP_SIZE}"

if [[ "$BACKUP_FILENAME" == *.gz ]]; then
    log "  Checking gzip integrity..."
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        die "Backup file failed gzip integrity check. File may be corrupted."
    fi
    log "  Gzip integrity: OK"

    log "  Checking SQL content..."
    if ! zcat "$BACKUP_FILE" | head -5 | grep -qiE '(PostgreSQL|CREATE|SET)'; then
        log "  WARNING: First 5 lines don't look like a PostgreSQL dump."
        log "  Continuing anyway, but verify the file manually if restore fails."
    else
        log "  SQL content: OK"
    fi
else
    log "  Checking dump file header..."
    if ! pg_restore -l "$BACKUP_FILE" >/dev/null 2>&1; then
        die "Backup file is not a valid pg_restore dump."
    fi
    log "  Dump format: OK"
fi

# Safety confirmation
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    echo ""
    echo "WARNING: This will OVERWRITE the configured target database."
    echo "  Host: ${DB_HOST_DISPLAY}:${DB_PORT_DISPLAY}"
    echo "  User: ${DB_USER_DISPLAY}"
    echo "  Backup: ${BACKUP_FILENAME} (${BACKUP_SIZE})"
    echo ""
    read -r -p "Type 'RESTORE' to confirm: " CONFIRM
    if [ "$CONFIRM" != "RESTORE" ]; then
        log "Aborted by user."
        exit 0
    fi
fi

if $DRY_RUN; then
    log "DRY RUN: Would restore ${BACKUP_FILENAME} to the configured target database"
    log "DRY RUN: Would run post-restore health check"
    log "DRY RUN complete. No changes made."
    exit 0
fi

log "========================================="
log "Starting restore..."

# Run pre-restore health check
log "  Pre-restore health check..."
if run_pg_isready >/dev/null 2>&1; then
    log "  Database is currently accessible"
else
    log "  WARNING: Database is not responding. Attempting restore anyway..."
fi

# Restore
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
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$BACKUP_FILE" 2>&1 | tail -20; then
        die "pg_restore failed. The target database may be inconsistent."
    fi
fi

log "  Restore command completed"

# Post-restore health check
log "========================================="
log "Post-restore health check..."

HEALTH_OK=true

# Check table count
TABLE_COUNT=$(run_psql -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    log "  Tables found: ${TABLE_COUNT}"
else
    log "  WARNING: No tables found in public schema"
    HEALTH_OK=false
fi

# Check record counts for key tables
for tbl in "User" "Audit" "AuditReport" "Subscription"; do
    COUNT=$(run_psql -t -c \
        "SELECT count(*) FROM \"${tbl}\";" 2>/dev/null | tr -d ' ' || echo "N/A")
    log "  ${tbl}: ${COUNT} rows"
    if [ "$COUNT" = "N/A" ]; then
        HEALTH_OK=false
    fi
done

# Check database connectivity
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
log "  Database: configured target (${DB_NAME_DISPLAY}@${DB_HOST_DISPLAY}:${DB_PORT_DISPLAY})"
