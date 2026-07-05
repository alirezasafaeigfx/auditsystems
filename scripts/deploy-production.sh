#!/bin/bash
# Production deployment script for AuditSystems
# Usage: bash scripts/deploy-production.sh
set -euo pipefail

echo "=== AuditSystems Production Deployment ==="
echo ""

# 1. Pre-flight checks
echo "1. Pre-flight checks..."
if [ ! -f .env ]; then
  echo "ERROR: .env file not found"
  exit 1
fi

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: prisma/schema.prisma not found"
  exit 1
fi

source .env 2>/dev/null || true
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set in .env"
  exit 1
fi
echo "   ✓ .env and DATABASE_URL configured"

# 2. Install dependencies
echo "2. Installing dependencies..."
pnpm install --frozen-lockfile
echo "   ✓ Dependencies installed"

# 3. Build
echo "3. Building..."
pnpm run build
echo "   ✓ Build complete"

# 4. Run database migration
echo "4. Running database migration..."
npx prisma migrate deploy
echo "   ✓ Migration complete"

# 5. Seed plans
echo "5. Seeding plans..."
pnpm run plans:seed
echo "   ✓ Plans seeded"

# 6. Run cleanup
echo "6. Running cleanup..."
pnpm run auth:cleanup || true
echo "   ✓ Cleanup complete"

# 7. Restart services
echo "7. Restarting services..."
if command -v pm2 &> /dev/null; then
  pm2 restart ecosystem.config.cjs --env production
  pm2 save
  echo "   ✓ PM2 services restarted"
else
  echo "   ⚠ PM2 not found. Start manually:"
  echo "     pnpm start &"
  echo "     pnpm run worker:dev &"
fi

# 8. Health check
echo "8. Running health check..."
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ready 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo "   ✓ Health check passed"
else
  echo "   ⚠ Health check returned $HEALTH (may need a moment to start)"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify: curl http://localhost:3000/api/ready"
echo "  2. Run smoke tests: bash scripts/smoke-public-routes.sh http://localhost:3000"
echo "  3. Set up cron: bash scripts/setup-cron.sh"
echo "  4. Monitor: pm2 logs"
