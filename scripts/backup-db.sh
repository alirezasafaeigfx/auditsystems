#!/bin/bash
# Production backup script for AuditSystems PostgreSQL database
# Usage: ./backup-db.sh [--dry-run]
#
# Features:
#   - pg_dump with timestamped filename
#   - gzip compression
#   - Backup file verification
#   - 30-day retention policy
#   - Logging to ops/backups/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE="${PROJECT_DIR}/ops/backups"
LOG_DIR="${BACKUP_BASE}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_BASE}/asdev-audit-${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

# Ensure backup directory exists before any logging
mkdir -p "$BACKUP_BASE"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    echo "$msg" >> "${LOG_DIR}/backup.log"
}

die() {
    log "FATAL: $1"
    exit 1
}

# Resolve database connection
if [ -n "${DATABASE_URL:-}" ]; then
    log "Using DATABASE_URL from environment"
elif [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ]; then
    PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" \
    DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@${POSTGRES_HOST:-localhost}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
    log "Constructed DATABASE_URL from individual env vars"
else
    log "No DATABASE_URL or POSTGRES_* vars set, using docker-compose defaults"
    PGPASSWORD="postgres" \
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asdev_audit"
fi

# Verify pg_dump is available
command -v pg_dump >/dev/null 2>&1 || die "pg_dump not found. Install postgresql-client."

log "========================================="
log "Starting backup: asdev-audit-${TIMESTAMP}"
log "Target file: ${BACKUP_FILE}"

if $DRY_RUN; then
    log "DRY RUN: Would run pg_dump and save to ${BACKUP_FILE}"
    log "DRY RUN: Would apply ${RETENTION_DAYS}-day retention policy"
    log "DRY RUN: Would verify backup file integrity"
    log "DRY RUN complete. No changes made."
    exit 0
fi

# Run pg_dump with gzip compression
log "Running pg_dump..."
if ! PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump \
    -h "${POSTGRES_HOST:-localhost}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER:-postgres}" \
    -d "${POSTGRES_DB:-asdev_audit}" \
    --no-owner \
    --no-privileges \
    -F p \
    2>> "${LOG_DIR}/backup.log" | gzip > "$BACKUP_FILE"; then
    rm -f "$BACKUP_FILE"
    die "pg_dump failed. Check ${LOG_DIR}/backup.log for details."
fi

# Verify backup file
if [ ! -f "$BACKUP_FILE" ]; then
    die "Backup file was not created: ${BACKUP_FILE}"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILE_SIZE=$(stat --printf="%s" "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo "0")

if [ "$FILE_SIZE" -lt 100 ]; then
    rm -f "$BACKUP_FILE"
    die "Backup file is suspiciously small (${FILE_SIZE} bytes). Dump may have failed."
fi

# Verify gzip integrity
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    rm -f "$BACKUP_FILE"
    die "Backup file failed gzip integrity check."
fi

log "Backup verified: ${BACKUP_SIZE} (${FILE_SIZE} bytes)"

# Apply retention policy
log "Applying ${RETENTION_DAYS}-day retention policy..."
DELETED_COUNT=0
while IFS= read -r -d '' old_file; do
    rm -f "$old_file"
    log "  Removed old backup: $(basename "$old_file")"
    DELETED_COUNT=$((DELETED_COUNT + 1))
done < <(find "$BACKUP_BASE" -name "asdev-audit-*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print0 2>/dev/null)
log "  Removed ${DELETED_COUNT} old backup(s)"

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_BASE" -name "asdev-audit-*.sql.gz" -type f 2>/dev/null | wc -l)
log "========================================="
log "Backup completed successfully"
log "  File: ${BACKUP_FILE}"
log "  Size: ${BACKUP_SIZE}"
log "  Retention: ${RETENTION_DAYS} days"
log "  Total backups on disk: ${TOTAL_BACKUPS}"
