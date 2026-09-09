#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/deploy/check-hosting-sync.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

MOCK_DIR="$TMP_DIR/bin"
mkdir -p "$MOCK_DIR"

cat >"$MOCK_DIR/rg" <<'EOF'
#!/usr/bin/env bash
exit 127
EOF

cat >"$MOCK_DIR/dig" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' '193.93.169.32'
EOF

cat >"$MOCK_DIR/ss" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat >"$MOCK_DIR/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s' '200'
EOF

chmod +x "$MOCK_DIR/rg" "$MOCK_DIR/dig" "$MOCK_DIR/ss" "$MOCK_DIR/curl"

set +e
output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
rc=$?
set -e

[[ "$rc" -eq 0 ]] || {
  printf '%s\n' "$output" >&2
  echo "expected deterministic hosting sync to succeed" >&2
  exit 1
}

for expected in \
  '[OK] deploy script contains staging port default' \
  '[OK] deploy script contains production port override' \
  '[OK] nginx template points production upstream to 3010' \
  '[OK] nginx template points staging upstream to 3011' \
  '[OK] DNS A audit.alirezasafaeisystems.ir -> 193.93.169.32'; do
  grep -Fq -- "$expected" <<<"$output" || {
    printf '%s\n' "$output" >&2
    echo "missing expected output: $expected" >&2
    exit 1
  }
done

if grep -Fq -- '[FAIL]' <<<"$output"; then
  printf '%s\n' "$output" >&2
  echo "deterministic success emitted a failure" >&2
  exit 1
fi

cat >"$MOCK_DIR/dig" <<'EOF'
#!/usr/bin/env bash
exit 127
EOF

set +e
dns_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
dns_rc=$?
set -e

[[ "$dns_rc" -eq 1 ]] || {
  printf '%s\n' "$dns_output" >&2
  echo "unavailable DNS evidence must fail closed" >&2
  exit 1
}
grep -Fq -- '[FAIL] DNS evidence unavailable' <<<"$dns_output" || {
  printf '%s\n' "$dns_output" >&2
  echo "unavailable DNS evidence was misclassified" >&2
  exit 1
}

cat >"$MOCK_DIR/dig" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' '193.93.169.32'
EOF
cat >"$MOCK_DIR/ss" <<'EOF'
#!/usr/bin/env bash
exit 127
EOF
chmod +x "$MOCK_DIR/dig" "$MOCK_DIR/ss"

set +e
socket_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
socket_rc=$?
set -e

[[ "$socket_rc" -eq 1 ]] || {
  printf '%s\n' "$socket_output" >&2
  echo "unavailable socket evidence must fail closed" >&2
  exit 1
}
grep -Fq -- '[FAIL] local port evidence unavailable' <<<"$socket_output" || {
  printf '%s\n' "$socket_output" >&2
  echo "unavailable socket evidence was misclassified" >&2
  exit 1
}

cat >"$MOCK_DIR/ss" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' 'garbage'
EOF
chmod +x "$MOCK_DIR/ss"

set +e
socket_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
socket_rc=$?
set -e
[[ "$socket_rc" -eq 1 ]] || { printf '%s\n' "$socket_output" >&2; echo "malformed socket evidence must fail closed" >&2; exit 1; }
grep -Fq -- '[FAIL] local port evidence malformed' <<<"$socket_output" || { printf '%s\n' "$socket_output" >&2; exit 1; }

cat >"$MOCK_DIR/ss" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$MOCK_DIR/dig" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' '999.999.999.999'
EOF
chmod +x "$MOCK_DIR/ss" "$MOCK_DIR/dig"

set +e
dns_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
dns_rc=$?
set -e
[[ "$dns_rc" -eq 1 ]] || { printf '%s\n' "$dns_output" >&2; echo "malformed DNS evidence must fail closed" >&2; exit 1; }
grep -Fq -- '[FAIL] DNS evidence malformed' <<<"$dns_output" || { printf '%s\n' "$dns_output" >&2; exit 1; }

cat >"$MOCK_DIR/dig" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' '193.93.169.32'
EOF
cat >"$MOCK_DIR/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s' 'not-a-status'
EOF
chmod +x "$MOCK_DIR/dig" "$MOCK_DIR/curl"

set +e
http_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
http_rc=$?
set -e
[[ "$http_rc" -eq 1 ]] || { printf '%s\n' "$http_output" >&2; echo "malformed HTTP evidence must fail closed" >&2; exit 1; }
grep -Fq -- '[FAIL] HTTP evidence malformed' <<<"$http_output" || { printf '%s\n' "$http_output" >&2; exit 1; }

cat >"$MOCK_DIR/curl" <<'EOF'
#!/usr/bin/env bash
exit 2
EOF
chmod +x "$MOCK_DIR/curl"

set +e
http_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" 2>&1)"
http_rc=$?
set -e
[[ "$http_rc" -eq 1 ]] || { printf '%s\n' "$http_output" >&2; echo "unavailable HTTP evidence must fail closed" >&2; exit 1; }
grep -Fq -- '[FAIL] HTTP evidence unavailable' <<<"$http_output" || { printf '%s\n' "$http_output" >&2; exit 1; }

cat >"$MOCK_DIR/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s' '200'
EOF
cat >"$MOCK_DIR/ssh" <<'EOF'
#!/usr/bin/env bash
command="${*: -1}"
case "$command" in
  *'echo connected'*) exit 0 ;;
  *'for p in'*) printf '%s\n' 'PORT:3010:LISTEN' 'PORT:3011:LISTEN' ;;
  *'pm2 jlist'*) printf '%s\n' 'APP:asdev-audit-ir-production:101' 'APP:asdev-audit-ir-production-worker:102' 'APP:asdev-audit-ir-staging:103' 'APP:asdev-audit-ir-staging-worker:104' ;;
  *'readlink /proc/'*) printf '%s\n' '/srv/asdev/current' ;;
  *'for u in'*) printf '%s\n' 'READY:http://127.0.0.1:3010/api/ready:CURL_ERROR:7' 'READY:http://127.0.0.1:3011/api/ready:CURL_ERROR:7' ;;
esac
EOF
chmod +x "$MOCK_DIR/curl" "$MOCK_DIR/ssh"

set +e
remote_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" --ssh-target fixture 2>&1)"
remote_rc=$?
set -e
[[ "$remote_rc" -eq 1 ]] || { printf '%s\n' "$remote_output" >&2; echo "remote curl failure must fail closed" >&2; exit 1; }
grep -Fq -- '[FAIL] remote http://127.0.0.1:3010/api/ready:CURL_ERROR:7' <<<"$remote_output" || { printf '%s\n' "$remote_output" >&2; exit 1; }

sed -i "s/\*'for u in'\*) printf.*/\*'for u in'\*) exit 0 ;;/" "$MOCK_DIR/ssh"
set +e
remote_output="$(cd "$REPO_ROOT" && PATH="$MOCK_DIR:$PATH" bash "$SCRIPT" --ssh-target fixture 2>&1)"
remote_rc=$?
set -e
[[ "$remote_rc" -eq 1 ]] || { printf '%s\n' "$remote_output" >&2; echo "empty remote readiness evidence must fail closed" >&2; exit 1; }
grep -Fq -- '[FAIL] remote readiness evidence unavailable (empty response)' <<<"$remote_output" || { printf '%s\n' "$remote_output" >&2; exit 1; }

echo "hosting sync diagnostics: PASS"
