#!/bin/bash
set -e

SSH_HOST="${SSH_HOST:-deploy@185.3.124.93}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
PROJECT_PATH="/home/deploy/auditsystems"

echo "Setting up admin credentials on VPS..."

# Generate secure credentials
ADMIN_PASS=$(openssl rand -base64 24)
SESSION_SECRET=$(openssl rand -hex 32)

ssh -i "$SSH_KEY" "$SSH_HOST" << ENDSSH
cd $PROJECT_PATH

# Backup existing .env
cp .env .env.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Add admin credentials if not exist
if ! grep -q "ADMIN_USERNAME" .env 2>/dev/null; then
  echo "" >> .env
  echo "# Admin Authentication" >> .env
  echo "ADMIN_USERNAME=admin" >> .env
  echo "ADMIN_PASSWORD=$ADMIN_PASS" >> .env
  echo "ADMIN_SESSION_SECRET=$SESSION_SECRET" >> .env
  echo "✓ Admin credentials added"
else
  echo "⚠ Admin credentials already exist, skipping"
fi

# Restart PM2
pm2 restart auditsystems 2>/dev/null || echo "⚠ PM2 restart failed, manual restart needed"

echo "✓ Setup complete"
ENDSSH

echo ""
echo "Admin credentials:"
echo "Username: admin"
echo "Password: $ADMIN_PASS"
echo ""
echo "⚠ Save these credentials securely!"
