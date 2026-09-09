#!/usr/bin/env bash
set -euo pipefail

STRICT=false
EXPECTED_IP="193.93.169.32"
PROD_DOMAIN="audit.alirezasafaeisystems.ir"
STAGING_DOMAIN="staging.audit.alirezasafaeisystems.ir"
PROD_PORT="3010"
STAGING_PORT="3011"
SSH_TARGET=""
SSH_KEY=""

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
NOTE_COUNT=0

usage() {
  cat <<'USAGE'
Usage: scripts/deploy/check-hosting-sync.sh [options]

Options:
  --strict                      Exit non-zero on warnings too
  --expected-ip <ip>            Expected A record target (default: 193.93.169.32)
  --prod-domain <domain>        Production domain (default: audit.alirezasafaeisystems.ir)
  --staging-domain <domain>     Staging domain (default: staging.audit.alirezasafaeisystems.ir)
  --prod-port <port>            Production upstream port (default: 3010)
  --staging-port <port>         Staging upstream port (default: 3011)
  --ssh-target <user@host>      Optional remote target for on-host checks
  --ssh-key <path>              Optional private key for ssh
  -h, --help                    Show help
USAGE
}

log_ok() {
  echo "[OK] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_warn() {
  echo "[WARN] $*"
  WARN_COUNT=$((WARN_COUNT + 1))
}

log_fail() {
  echo "[FAIL] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_note() {
  echo "[NOTE] $*"
  NOTE_COUNT=$((NOTE_COUNT + 1))
}

require_file() {
  local path="$1"
  local desc="$2"
  if [[ -f "$path" ]]; then
    log_ok "$desc found: $path"
  else
    log_fail "$desc missing: $path"
  fi
}

check_contains() {
  local path="$1"
  local pattern="$2"
  local desc="$3"
  if grep -F -- "$pattern" "$path" >/dev/null 2>&1; then
    log_ok "$desc"
  else
    log_fail "$desc (pattern not found: $pattern)"
  fi
}

check_dns_a_record() {
  local domain="$1"
  local expected_ip="$2"
  local dns_output rc resolved
  set +e
  dns_output="$(dig +short A "$domain" 2>&1)"
  rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    log_fail "DNS evidence unavailable for $domain (dig exit $rc)"
    return
  fi
  resolved="$(printf '%s\n' "$dns_output" | tail -n1)"
  if [[ -z "$resolved" ]]; then
    log_warn "DNS A not resolved for $domain"
    return
  fi
  if [[ ! "$resolved" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    log_fail "DNS evidence malformed for $domain"
    return
  fi
  local octet
  IFS='.' read -r -a octets <<< "$resolved"
  for octet in "${octets[@]}"; do
    if (( 10#$octet > 255 )); then
      log_fail "DNS evidence malformed for $domain"
      return
    fi
  done
  if [[ "$resolved" == "$expected_ip" ]]; then
    log_ok "DNS A $domain -> $resolved"
  else
    log_warn "DNS A $domain -> $resolved (expected $expected_ip)"
  fi
}

check_http_status() {
  local url="$1"
  local expected="$2"
  local soft="${3:-false}"

  local tmp_err rc status
  tmp_err="$(mktemp)"
  set +e
  status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 12 "$url" 2>"$tmp_err")"
  rc=$?
  set -e

  if [[ "$rc" -eq 0 && "$status" == "$expected" ]]; then
    log_ok "HTTP $url -> $status"
    rm -f "$tmp_err"
    return
  fi

  local err
  err="$(tr '\n' ' ' < "$tmp_err" | sed 's/  */ /g')"
  rm -f "$tmp_err"

  if [[ "$rc" -eq 0 && ! "$status" =~ ^[1-5][0-9]{2}$ ]]; then
    log_fail "HTTP evidence malformed for $url"
    return
  fi

  if [[ "$rc" -ne 0 ]]; then
    if [[ "$rc" -eq 2 || "$rc" -eq 127 ]]; then
      log_fail "HTTP evidence unavailable for $url (curl exit $rc)"
    elif [[ "$err" == *"SSL"* || "$err" == *"certificate"* ]]; then
      if [[ "$soft" == "true" ]]; then
        log_note "HTTP $url TLS validation failed (non-blocking due to --ssh-target mode)"
      else
        log_warn "HTTP $url TLS validation failed"
      fi
    elif [[ "$err" == *"timed out"* || "$err" == *"Timeout"* ]]; then
      if [[ "$soft" == "true" ]]; then
        log_note "HTTP $url timed out from current network (non-blocking due to --ssh-target mode)"
      else
        log_warn "HTTP $url timed out from current network"
      fi
    else
      if [[ "$soft" == "true" ]]; then
        log_note "HTTP $url failed (curl exit $rc, non-blocking due to --ssh-target mode)"
      else
        log_warn "HTTP $url failed (curl exit $rc)"
      fi
    fi
    return
  fi

  if [[ "$status" =~ ^5 ]]; then
    if [[ "$soft" == "true" ]]; then
      log_note "HTTP $url -> $status (non-blocking due to --ssh-target mode)"
    else
      log_fail "HTTP $url -> $status"
    fi
  else
    if [[ "$soft" == "true" ]]; then
      log_note "HTTP $url -> $status (expected $expected, non-blocking due to --ssh-target mode)"
    else
      log_warn "HTTP $url -> $status (expected $expected)"
    fi
  fi
}

check_local_port_free() {
  local port="$1"
  local sockets rc
  set +e
  sockets="$(ss -H -ltn "( sport = :$port )" 2>&1)"
  rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    log_fail "local port evidence unavailable for $port (ss exit $rc)"
  elif [[ -n "$sockets" ]] && ! printf '%s\n' "$sockets" | grep -Eq "^LISTEN[[:space:]].*:${port}([[:space:]]|$)"; then
    log_fail "local port evidence malformed for $port"
  elif [[ -n "$sockets" ]]; then
    log_warn "local port $port is in-use on this machine"
  else
    log_ok "local port $port is free on this machine"
  fi
}

run_ssh_checks() {
  local target="$1"
  local ssh_cmd=(ssh -o BatchMode=yes -o ConnectTimeout=10)
  if [[ -n "$SSH_KEY" ]]; then
    ssh_cmd+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
  fi
  ssh_cmd+=("$target")

  if ! "${ssh_cmd[@]}" "echo connected >/dev/null"; then
    log_fail "ssh connection failed: $target"
    return
  fi
  log_ok "ssh connection ok: $target"

  local ports_line
  ports_line="$("${ssh_cmd[@]}" "set -euo pipefail; for p in $PROD_PORT $STAGING_PORT; do if ss -ltn \"( sport = :\$p )\" | grep -q \":\$p\"; then echo PORT:\$p:LISTEN; else echo PORT:\$p:CLOSED; fi; done" || true)"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    case "$line" in
      PORT:*:LISTEN) log_ok "remote ${line#PORT:}" ;;
      PORT:*:CLOSED) log_fail "remote ${line#PORT:}" ;;
    esac
  done <<< "$ports_line"

  local apps_line
  local saw_prod_web=false
  local saw_prod_worker=false
  local saw_staging_web=false
  local saw_staging_worker=false
  apps_line="$("${ssh_cmd[@]}" "set -euo pipefail; if command -v pm2 >/dev/null 2>&1; then pm2 jlist --silent 2>/dev/null | jq -r '.[] | select(.name==\"asdev-audit-ir-production\" or .name==\"asdev-audit-ir-production-worker\" or .name==\"asdev-audit-ir-staging\" or .name==\"asdev-audit-ir-staging-worker\") | \"APP:\(.name):\(.pid)\"'; fi" || true)"

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local app_name app_pid cwd_link
    app_name="$(echo "$line" | cut -d: -f2)"
    app_pid="$(echo "$line" | cut -d: -f3)"
    log_ok "remote pm2 app $app_name (pid=$app_pid)"

    if [[ "$app_pid" =~ ^[0-9]+$ ]] && [[ "$app_pid" -gt 1 ]]; then
      cwd_link="$("${ssh_cmd[@]}" "readlink /proc/$app_pid/cwd 2>/dev/null || true")"
      if [[ -z "$cwd_link" ]]; then
        log_warn "remote $app_name cwd not readable"
      elif [[ "$cwd_link" == *" (deleted)" ]]; then
        log_fail "remote $app_name is running from deleted release path: $cwd_link"
      else
        log_ok "remote $app_name cwd: $cwd_link"
      fi
    fi
  if [[ "$app_name" == "asdev-audit-ir-production" ]]; then
    saw_prod_web=true
  elif [[ "$app_name" == "asdev-audit-ir-production-worker" ]]; then
    saw_prod_worker=true
  elif [[ "$app_name" == "asdev-audit-ir-staging" ]]; then
    saw_staging_web=true
  elif [[ "$app_name" == "asdev-audit-ir-staging-worker" ]]; then
    saw_staging_worker=true
  fi

  done <<< "$apps_line"


  if ! $saw_prod_web; then
    log_fail "remote pm2 app asdev-audit-ir-production missing"
  fi
  if ! $saw_prod_worker; then
    log_warn "remote pm2 app asdev-audit-ir-production-worker missing"
  fi
  if ! $saw_staging_web; then
    log_fail "remote pm2 app asdev-audit-ir-staging missing"
  fi
  if ! $saw_staging_worker; then
    log_warn "remote pm2 app asdev-audit-ir-staging-worker missing"
  fi

  local ready_line ready_rc
  set +e
  ready_line="$("${ssh_cmd[@]}" "set -euo pipefail; for u in http://127.0.0.1:$PROD_PORT/api/ready http://127.0.0.1:$STAGING_PORT/api/ready; do if code=\$(curl -sS -o /dev/null -w \"%{http_code}\" --max-time 20 \"\$u\"); then echo READY:\$u:\$code; else rc=\$?; echo READY:\$u:CURL_ERROR:\$rc; fi; done")"
  ready_rc=$?
  set -e

  if [[ "$ready_rc" -ne 0 ]]; then
    log_fail "remote readiness evidence unavailable (ssh exit $ready_rc)"
    return
  fi
  if [[ -z "$ready_line" ]]; then
    log_fail "remote readiness evidence unavailable (empty response)"
    return
  fi

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    case "$line" in
      READY:*:200) log_ok "remote ${line#READY:}" ;;
      READY:*:CURL_ERROR:*) log_fail "remote ${line#READY:}" ;;
      READY:*:5*) log_fail "remote ${line#READY:}" ;;
      READY:*:[1-4][0-9][0-9]) log_warn "remote ${line#READY:}" ;;
      READY:*) log_fail "remote readiness evidence malformed" ;;
    esac
  done <<< "$ready_line"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict) STRICT=true; shift ;;
    --expected-ip) EXPECTED_IP="${2:-}"; shift 2 ;;
    --prod-domain) PROD_DOMAIN="${2:-}"; shift 2 ;;
    --staging-domain) STAGING_DOMAIN="${2:-}"; shift 2 ;;
    --prod-port) PROD_PORT="${2:-}"; shift 2 ;;
    --staging-port) STAGING_PORT="${2:-}"; shift 2 ;;
    --ssh-target) SSH_TARGET="${2:-}"; shift 2 ;;
    --ssh-key) SSH_KEY="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

echo "[check] starting hosting sync checks"
echo "[check] prod domain: $PROD_DOMAIN ($PROD_PORT)"
echo "[check] staging domain: $STAGING_DOMAIN ($STAGING_PORT)"
echo "[check] expected ip: $EXPECTED_IP"

require_file "ops/deploy/deploy.sh" "deploy script"
require_file "scripts/deploy/provision-nginx-site.sh" "nginx provision script"
require_file "ops/nginx/asdev-audit-ir.conf" "nginx template"

check_contains "ops/deploy/deploy.sh" "PORT=\"3011\"" "deploy script contains staging port default"
check_contains "ops/deploy/deploy.sh" "PORT=\"3010\"" "deploy script contains production port override"
check_contains "ops/nginx/asdev-audit-ir.conf" "127.0.0.1:3010" "nginx template points production upstream to 3010"
check_contains "ops/nginx/asdev-audit-ir.conf" "127.0.0.1:3011" "nginx template points staging upstream to 3011"

check_local_port_free "$PROD_PORT"
check_local_port_free "$STAGING_PORT"

check_dns_a_record "$PROD_DOMAIN" "$EXPECTED_IP"
check_dns_a_record "$STAGING_DOMAIN" "$EXPECTED_IP"

if [[ -n "$SSH_TARGET" ]]; then
  check_http_status "https://$PROD_DOMAIN/api/ready" "200" "true"
  check_http_status "https://$STAGING_DOMAIN/api/ready" "200" "true"
else
  check_http_status "https://$PROD_DOMAIN/api/ready" "200"
  check_http_status "https://$STAGING_DOMAIN/api/ready" "200"
fi

if [[ -n "$SSH_TARGET" ]]; then
  run_ssh_checks "$SSH_TARGET"
else
  log_warn "ssh checks skipped (pass --ssh-target user@host)"
fi

echo "[check] summary: pass=$PASS_COUNT note=$NOTE_COUNT warn=$WARN_COUNT fail=$FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
if [[ "$STRICT" == "true" && "$WARN_COUNT" -gt 0 ]]; then
  exit 1
fi
