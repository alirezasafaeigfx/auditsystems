#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
WORKFLOW="$REPO_ROOT/.github/workflows/deploy-vps-manual.yml"

[[ -f "$WORKFLOW" ]] || { echo "deploy workflow missing" >&2; exit 1; }

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

require_literal 'options: [staging]'
require_literal 'PUBLIC_URL: ${{ vars.PUBLIC_URL }}'
require_literal 'VPS_BASE_DIR: ${{ vars.VPS_BASE_DIR }}'
require_literal 'APP_PORT: ${{ vars.APP_PORT }}'
require_literal 'VPS_KNOWN_HOSTS: ${{ secrets.VPS_KNOWN_HOSTS }}'
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
reject_literal 'ssh-keyscan'
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

echo "deploy workflow integrity fixtures: PASS"
