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

echo "hosting sync diagnostics: PASS"
