#!/bin/bash
# Cron setup for AuditSystems scheduled tasks
# Run this on the production server to set up all cron jobs
# Usage: bash scripts/setup-cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

echo "Setting up cron jobs for AuditSystems..."

# Remove existing audit cron jobs
crontab -l 2>/dev/null | grep -v "auditsystems" | grep -v "cleanup" | grep -v "scheduled:run" | grep -v "subscriptions:expire" > /tmp/crontab-clean || true

# Add new cron jobs
cat >> /tmp/crontab-clean << 'EOF'

# AuditSystems - Cleanup expired sessions and tokens (daily at 3 AM)
0 3 * * * cd /home/dev13/my-project/sites/live/auditsystems && pnpm run auth:cleanup >> logs/cleanup.log 2>&1

# AuditSystems - Run scheduled audits (every hour)
0 * * * * cd /home/dev13/my-project/sites/live/auditsystems && pnpm run scheduled:run >> logs/scheduled-audits.log 2>&1

# AuditSystems - Expire subscriptions (daily at 4 AM)
0 4 * * * cd /home/dev13/my-project/sites/live/auditsystems && pnpm run subscriptions:expire >> logs/subscriptions.log 2>&1

EOF

crontab /tmp/crontab-clean
rm -f /tmp/crontab-clean

echo "Cron jobs installed:"
echo "  - auth:cleanup: daily at 3 AM"
echo "  - scheduled:run: every hour"
echo "  - subscriptions:expire: daily at 4 AM"
echo ""
echo "Verify with: crontab -l"
