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

# Resolve database connection
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD:-postgres}"
DB_NAME="${POSTGRES_DB:-asdev_audit}"

if [ -n "${DATABASE_URL:-}" ]; then
    log "Using DATABASE_URL from environment"
fi

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
    echo "WARNING: This will OVERWRITE the current database '${DB_NAME}'."
    echo "  Host: ${DB_HOST}:${DB_PORT}"
    echo "  User: ${DB_USER}"
    echo "  Backup: ${BACKUP_FILENAME} (${BACKUP_SIZE})"
    echo ""
    read -r -p "Type 'RESTORE' to confirm: " CONFIRM
    if [ "$CONFIRM" != "RESTORE" ]; then
        log "Aborted by user."
        exit 0
    fi
fi

if $DRY_RUN; then
    log "DRY RUN: Would restore ${BACKUP_FILENAME} to ${DB_NAME}"
    log "DRY RUN: Would run post-restore health check"
    log "DRY RUN complete. No changes made."
    exit 0
fi

log "========================================="
log "Starting restore..."

# Run pre-restore health check
log "  Pre-restore health check..."
if PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    log "  Database is currently accessible"
else
    log "  WARNING: Database is not responding. Attempting restore anyway..."
fi

# Restore
if [[ "$BACKUP_FILENAME" == *.gz ]]; then
    log "  Decompressing and restoring..."
    if ! zcat "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --set ON_ERROR_STOP=1 \
        2>&1 | tail -20; then
        die "Restore failed. The database may be in an inconsistent state."
    fi
else
    log "  Restoring from custom dump format..."
    if ! PGPASSWORD="$DB_PASS" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$BACKUP_FILE" 2>&1 | tail -20; then
        log "WARNING: pg_restore completed with warnings (may be non-critical)"
    fi
fi

log "  Restore command completed"

# Post-restore health check
log "========================================="
log "Post-restore health check..."

HEALTH_OK=true

# Check table count
TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    log "  Tables found: ${TABLE_COUNT}"
else
    log "  WARNING: No tables found in public schema"
    HEALTH_OK=false
fi

# Check record counts for key tables
for tbl in "User" "Audit" "AuditReport" "Subscription"; do
    COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT count(*) FROM \"${tbl}\";" 2>/dev/null | tr -d ' ' || echo "N/A")
    log "  ${tbl}: ${COUNT} rows"
done

# Check database connectivity
if PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    log "  Connectivity: OK"
else
    log "  WARNING: Database not responding to pg_isready"
    HEALTH_OK=false
fi

log "========================================="
if $HEALTH_OK; then
    log "Restore completed successfully"
else
    log "Restore completed with warnings. Review health check output above."
fi
log "  Source: ${BACKUP_FILENAME}"
log "  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
