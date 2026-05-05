#!/bin/bash
set -e

echo "Deploying auditsystems to production..."

# Build locally
cd /home/dev/Project/auditsystems
pnpm run build

# Create deployment package
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
DEPLOY_DIR="/tmp/auditsystems-deploy-$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.next' \
  .next/ "$DEPLOY_DIR/.next/"
cp -r public "$DEPLOY_DIR/" 2>/dev/null || true
cp package.json pnpm-lock.yaml "$DEPLOY_DIR/"
cp -r prisma "$DEPLOY_DIR/"

# Deploy to VPS
ssh deploy@185.3.124.93 "mkdir -p /var/www/asdev-audit-ir/releases/production/$TIMESTAMP"
rsync -avz "$DEPLOY_DIR/" deploy@185.3.124.93:/var/www/asdev-audit-ir/releases/production/$TIMESTAMP/

# Install and restart on VPS
ssh deploy@185.3.124.93 << ENDSSH
cd /var/www/asdev-audit-ir/releases/production/$TIMESTAMP
pnpm install --prod
cp /var/www/asdev-audit-ir/releases/production/20260501T072059Z-batch-audit/.env .env
pm2 restart asdev-audit-ir-production --update-env
ENDSSH

echo "✓ Deployment complete: $TIMESTAMP"
rm -rf "$DEPLOY_DIR"
