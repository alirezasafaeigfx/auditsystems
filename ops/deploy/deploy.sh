#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=""
BASE_DIR="/var/www/asdev-audit-ir"
SOURCE_DIR=""
RELEASE_ID=""
KEEP_RELEASES=5
APP_SLUG="asdev-audit-ir"

usage() {
  cat <<USAGE
Usage: $(basename "$0") --env <staging|production> --source-dir <path> [options]

Required:
  --env <name>             Target environment (staging, production)
  --source-dir <path>      Extracted release source directory

Optional:
  --app-slug <name>        Logical app slug (default: asdev-audit-ir)
  --base-dir <path>        Base directory on server (default: /var/www/asdev-audit-ir)
  --release-id <id>        Release identifier (default: UTC timestamp)
  --keep-releases <n>      Number of old releases to keep per env (default: 5)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="${2:-}"; shift 2 ;;
    --base-dir) BASE_DIR="${2:-}"; shift 2 ;;
    --app-slug) APP_SLUG="${2:-}"; shift 2 ;;
    --source-dir) SOURCE_DIR="${2:-}"; shift 2 ;;
    --release-id) RELEASE_ID="${2:-}"; shift 2 ;;
    --keep-releases) KEEP_RELEASES="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "[deploy] unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$ENVIRONMENT" || -z "$SOURCE_DIR" ]]; then
  usage
  exit 1
fi
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "[deploy] unsupported environment: $ENVIRONMENT" >&2
  exit 1
fi
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "[deploy] source directory not found: $SOURCE_DIR" >&2
  exit 1
fi
if [[ -z "$RELEASE_ID" ]]; then
  RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
fi
for bin in rsync pm2 node pnpm; do
  command -v "$bin" >/dev/null 2>&1 || { echo "[deploy] $bin is required" >&2; exit 1; }
done

SHARED_DIR="$BASE_DIR/shared"
ENV_DIR="$SHARED_DIR/env"
LOG_DIR="$SHARED_DIR/logs"
RELEASES_DIR="$BASE_DIR/releases/$ENVIRONMENT"
CURRENT_LINK="$BASE_DIR/current/$ENVIRONMENT"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
ENV_FILE="$ENV_DIR/$ENVIRONMENT.env"
APP_NAME="$APP_SLUG-$ENVIRONMENT"
APP_WEB_NAME="${APP_NAME}-web"
APP_WORKER_NAME="${APP_NAME}-worker"
PORT="3011"
[[ "$ENVIRONMENT" == "production" ]] && PORT="3010"

mkdir -p "$ENV_DIR" "$LOG_DIR" "$RELEASES_DIR" "$BASE_DIR/current"
[[ -f "$ENV_FILE" ]] || { echo "[deploy] missing env file: $ENV_FILE" >&2; exit 1; }

mkdir -p "$RELEASE_DIR"
rsync -a --delete \
  --exclude '.git' --exclude '.github' --exclude 'node_modules' --exclude '.next/cache' \
  --exclude 'coverage' --exclude 'test-results' \
  "$SOURCE_DIR/" "$RELEASE_DIR/"

cd "$RELEASE_DIR"
pnpm install --frozen-lockfile
pnpm prisma generate

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export NODE_ENV=production
export HOSTNAME=127.0.0.1
export PORT

pnpm prisma migrate deploy
pnpm run build

cat > ecosystem.config.cjs <<ECOSYSTEM
module.exports = {
  apps: [
    {
      name: '$APP_WEB_NAME',
      cwd: '$RELEASE_DIR',
      script: 'node',
      args: '.next/standalone/server.js',
      env_file: '$ENV_FILE',
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '$PORT'
      },
      max_restarts: 10,
      restart_delay: 3000,
      out_file: '$LOG_DIR/$APP_WEB_NAME.out.log',
      error_file: '$LOG_DIR/$APP_WEB_NAME.err.log',
      merge_logs: true,
      time: true
    },
    {
      name: '$APP_WORKER_NAME',
      cwd: '$RELEASE_DIR',
      script: 'pnpm',
      args: 'run worker:dev',
      env_file: '$ENV_FILE',
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      restart_delay: 3000,
      out_file: '$LOG_DIR/$APP_WORKER_NAME.out.log',
      error_file: '$LOG_DIR/$APP_WORKER_NAME.err.log',
      merge_logs: true,
      time: true
    }
  ]
};
ECOSYSTEM
 
if pm2 describe "$APP_WEB_NAME" >/dev/null 2>&1 || pm2 describe "$APP_WORKER_NAME" >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi
pm2 save >/dev/null 2>&1 || true

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

for attempt in {1..20}; do
  if curl -fsS "http://127.0.0.1:$PORT/api/ready" >/dev/null 2>&1; then
    echo "[deploy] health check passed for $ENVIRONMENT on port $PORT"
    break
  fi
  [[ "$attempt" -eq 20 ]] && { echo "[deploy] health check failed" >&2; exit 1; }
  sleep 2
done

mapfile -t releases < <(ls -1dt "$RELEASES_DIR"/* 2>/dev/null || true)
if (( ${#releases[@]} > KEEP_RELEASES )); then
  for old_release in "${releases[@]:KEEP_RELEASES}"; do rm -rf "$old_release"; done
fi

echo "[deploy] completed $ENVIRONMENT release $RELEASE_ID"
