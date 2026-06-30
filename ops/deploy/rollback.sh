#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=""
BASE_DIR="/var/www/asdev-audit-ir"
TARGET_RELEASE=""
APP_SLUG="asdev-audit-ir"

usage() {
  cat <<USAGE
Usage: $(basename "$0") --env <staging|production> [options]

Required:
  --env <name>             Target environment

Optional:
  --app-slug <name>        Logical app slug (default: asdev-audit-ir)
  --base-dir <path>        Base directory on server (default: /var/www/asdev-audit-ir)
  --target-release <id>    Explicit release directory name
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="${2:-}"; shift 2 ;;
    --base-dir) BASE_DIR="${2:-}"; shift 2 ;;
    --app-slug) APP_SLUG="${2:-}"; shift 2 ;;
    --target-release) TARGET_RELEASE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "[rollback] unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "$ENVIRONMENT" ]] || { usage; exit 1; }
[[ "$ENVIRONMENT" == "staging" || "$ENVIRONMENT" == "production" ]] || { echo "[rollback] invalid env" >&2; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "[rollback] pm2 required" >&2; exit 1; }

RELEASES_DIR="$BASE_DIR/releases/$ENVIRONMENT"
CURRENT_LINK="$BASE_DIR/current/$ENVIRONMENT"
APP_NAME="$APP_SLUG-$ENVIRONMENT"
APP_WEB_NAME="${APP_NAME}-web"
APP_WORKER_NAME="${APP_NAME}-worker"
PORT="3011"
[[ "$ENVIRONMENT" == "production" ]] && PORT="3010"

if [[ -z "$TARGET_RELEASE" ]]; then
  current_target=""
  [[ -L "$CURRENT_LINK" ]] && current_target="$(readlink -f "$CURRENT_LINK")"
  mapfile -t releases < <(ls -1dt "$RELEASES_DIR"/* 2>/dev/null || true)
  (( ${#releases[@]} >= 2 )) || { echo "[rollback] need at least two releases" >&2; exit 1; }
  for candidate in "${releases[@]}"; do
    [[ "$candidate" == "$current_target" ]] && continue
    TARGET_RELEASE="$(basename "$candidate")"
    break
  done
fi

TARGET_DIR="$RELEASES_DIR/$TARGET_RELEASE"
[[ -d "$TARGET_DIR" && -f "$TARGET_DIR/ecosystem.config.cjs" ]] || { echo "[rollback] invalid target: $TARGET_DIR" >&2; exit 1; }

ln -sfn "$TARGET_DIR" "$CURRENT_LINK"
pm2 delete "$APP_WEB_NAME" >/dev/null 2>&1 || true
pm2 delete "$APP_WORKER_NAME" >/dev/null 2>&1 || true
pm2 start "$TARGET_DIR/ecosystem.config.cjs" --update-env
pm2 save >/dev/null 2>&1 || true

for attempt in {1..20}; do
  if curl -fsS "http://127.0.0.1:$PORT/api/ready" >/dev/null 2>&1; then
    echo "[rollback] health check passed for $ENVIRONMENT on port $PORT"
    break
  fi
  [[ "$attempt" -eq 20 ]] && { echo "[rollback] health check failed" >&2; exit 1; }
  sleep 2
done

echo "[rollback] switched $ENVIRONMENT to release $TARGET_RELEASE ($APP_WEB_NAME, $APP_WORKER_NAME)"
