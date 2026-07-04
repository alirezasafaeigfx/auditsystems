#!/bin/bash
# Example backup script for AuditSystems database
# Usage: ./backup-db.example.sh
#
# This script backs up the PostgreSQL database using pg_dump.
# It refuses to run if DATABASE_URL is not set.

set -euo pipefail

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set."
    echo "Please set DATABASE_URL before running this script."
    echo "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/auditsystems'"
    exit 1
fi

# Create backup directory (outside repo)
BACKUP_DIR="../backups"
BACKUP_FILE="${BACKUP_DIR}/auditsystems-$(date +%Y%m%d-%H%M%S).dump"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Database: ${DATABASE_URL%%@*}@***"
echo "Backup file: ${BACKUP_FILE}"

# Run pg_dump
pg_dump --format=custom "$DATABASE_URL" > "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR" | cut -f1)
    echo ""
    echo "Backup completed successfully!"
    echo "File: ${BACKUP_FILE}"
    echo "Size: ${BACKUP_SIZE}"
    echo ""
    echo "To restore this backup:"
    echo "  pg_restore --clean --if-exists -d auditsystems ${BACKUP_FILE}"
else
    echo "ERROR: Backup file was not created."
    exit 1
fi
