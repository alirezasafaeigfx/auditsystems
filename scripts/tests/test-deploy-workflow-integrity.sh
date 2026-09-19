#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
WORKFLOW="$REPO_ROOT/.github/workflows/deploy-vps-manual.yml"
PREFLIGHT_WORKFLOW="$REPO_ROOT/.github/workflows/production-ssh-preflight.yml"

[[ -f "$WORKFLOW" ]] || { echo "deploy workflow missing" >&2; exit 1; }
[[ -f "$PREFLIGHT_WORKFLOW" ]] || { echo "production SSH preflight workflow missing" >&2; exit 1; }

require_literal() {
  local value="$1"
  if ! grep -F -- "$value" "$WORKFLOW" >/dev/null; then
    echo "deploy workflow missing required invariant: $value" >&2
    exit 1
  fi
}

reject_literal() {
  local value="$1"
  if grep -F -- "$value" "$WORKFLOW" >/dev/null; then
    echo "deploy workflow contains forbidden pattern: $value" >&2
    exit 1
  fi
}

require_preflight_literal() {
  local value="$1"
  if ! grep -F -- "$value" "$PREFLIGHT_WORKFLOW" >/dev/null; then
    echo "production SSH preflight missing required invariant: $value" >&2
    exit 1
  fi
}

reject_preflight_literal() {
  local value="$1"
  if grep -F -- "$value" "$PREFLIGHT_WORKFLOW" >/dev/null; then
    echo "production SSH preflight contains forbidden pattern: $value" >&2
    exit 1
  fi
}

require_literal 'options: [staging, production]'
require_literal 'production_confirmation:'
require_literal 'APPROVE_AUDITSYSTEMS_PRODUCTION_DEPLOY'
require_literal 'PRODUCTION_DEPLOY_ENABLED'
require_literal "inputs.environment == 'production'"
require_literal 'pnpm audit --prod --audit-level high'
require_literal 'BACKUP_BASE="\$SHARED_DIR/backups"'
require_literal 'bash scripts/backup-db.sh'
require_literal 'if [[ "$DEPLOY_ENV" == "production" ]]'
reject_literal 'production remains disabled'
require_literal 'PUBLIC_URL: ${{ vars.PUBLIC_URL }}'
require_literal 'VPS_BASE_DIR: ${{ vars.VPS_BASE_DIR }}'
require_literal 'APP_PORT: ${{ vars.APP_PORT }}'
require_literal 'VPS_HOST_KEY_SHA256: ${{ vars.VPS_HOST_KEY_SHA256 }}'
require_literal 'ssh-keyscan -p "$SSH_PORT" -t ed25519 "$SSH_HOST"'
require_literal 'ssh-keygen -lf "$HOME/.ssh/known_hosts" -E sha256'
require_literal 'sort -u'
require_literal 'HOST_KEY_FINGERPRINTS'
require_literal 'StrictHostKeyChecking=yes'
require_literal 'UserKnownHostsFile='
require_literal 'MIGRATION_EXECUTION_APPROVED'
require_literal 'run_migrations:'
require_literal '/api/version'
require_literal 'EXPECTED_SHA'
require_literal '.previous-release'
require_literal 'release_sha='
require_literal 'cancel-in-progress: false'

reject_literal 'StrictHostKeyChecking=no'
reject_literal 'VPS_KNOWN_HOSTS: ${{ secrets.VPS_KNOWN_HOSTS }}'
reject_literal 'PUBLIC_URL: https://audit.alirezasafaeisystems.ir'
reject_literal 'ls -1dt'
reject_literal "sed -n '2p'"
reject_literal 'PROD_PORT:'

known_hosts_count="$(grep -F -c -- 'StrictHostKeyChecking=yes' "$WORKFLOW")"
if [[ "$known_hosts_count" -lt 3 ]]; then
  echo "strict host verification must cover upload, deploy, and rollback" >&2
  exit 1
fi

version_check_count="$(grep -F -c -- '/api/version' "$WORKFLOW")"
if [[ "$version_check_count" -lt 3 ]]; then
  echo "exact release attestation must cover route, local smoke, and external smoke" >&2
  exit 1
fi

require_preflight_literal 'workflow_dispatch:'
require_preflight_literal 'permissions: {}'
require_preflight_literal "if: github.ref == 'refs/heads/main'"
require_preflight_literal 'runs-on: [self-hosted, linux, x64, asdev-ci]'
require_preflight_literal 'timeout-minutes: 5'
require_preflight_literal 'environment: production'
require_preflight_literal 'VPS_SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_PRIVATE_KEY }}'
require_preflight_literal 'VPS_HOST_KEY_SHA256: ${{ vars.VPS_HOST_KEY_SHA256 }}'
require_preflight_literal 'ssh-keyscan -p "$SSH_PORT" -t ed25519 "$SSH_HOST"'
require_preflight_literal 'ssh-keygen -lf "$SSH_DIR/known_hosts" -E sha256'
require_preflight_literal 'sort -u'
require_preflight_literal 'StrictHostKeyChecking=yes'
require_preflight_literal 'UserKnownHostsFile="$SSH_DIR/known_hosts"'
require_preflight_literal 'ssh-keygen -y -f "$SSH_DIR/deploy_key"'
require_preflight_literal 'ConnectTimeout=10'
require_preflight_literal 'test -d'
reject_preflight_literal 'uses:'
reject_preflight_literal 'actions/checkout'
reject_preflight_literal 'scp '
reject_preflight_literal 'rsync '
reject_preflight_literal 'prisma migrate'
reject_preflight_literal 'pm2 '
reject_preflight_literal 'deploy.sh'
reject_preflight_literal 'backup-db.sh'

if grep -Eq '^[[:space:]]+(push|pull_request|schedule):' "$PREFLIGHT_WORKFLOW"; then
  echo "production SSH preflight must remain manual-only" >&2
  exit 1
fi

echo "deploy workflow integrity fixtures: PASS"
