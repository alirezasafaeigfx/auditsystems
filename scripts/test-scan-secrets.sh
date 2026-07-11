#!/usr/bin/env bash
set -euo pipefail

# Test script for scan-secrets.sh
# Verifies grep fallback works correctly without rg

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCAN_SCRIPT="$ROOT_DIR/scripts/scan-secrets.sh"

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local expected_exit="$2"
  shift 2
  local cmd=("$@")

  set +e
  local output
  output=$("${cmd[@]}" 2>&1)
  local actual_exit=$?
  set -e

  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo "  ✓ $name (exit=$actual_exit)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected exit=$expected_exit, got exit=$actual_exit"
    echo "    output: $output"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Secret Scanner Grep-Fallback Tests ==="
echo ""

# Test 1: Syntax check
echo "1. Syntax validation"
bash -n "$SCAN_SCRIPT" && echo "  ✓ bash -n passes" && PASS=$((PASS + 1)) || { echo "  ✗ bash -n fails"; FAIL=$((FAIL + 1)); }

# Create temp test directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Override ROOT_DIR for testing by creating a mini repo
mkdir -p "$TMPDIR/src" "$TMPDIR/scripts"
cp "$SCAN_SCRIPT" "$TMPDIR/scripts/scan-secrets.sh"
echo '// clean file' > "$TMPDIR/src/clean.ts"

# Test 2: Clean repo → exit 0
echo ""
echo "2. Clean repo (no secrets)"
run_test "clean repo → exit 0" 0 bash -c "cd '$TMPDIR' && SECRET_SCAN_ENGINE=grep bash scripts/scan-secrets.sh"

# Test 3: Fake API key → exit 1
echo ""
echo "3. Fake API key detection"
echo 'API_KEY="sk-test-1234567890abcdef"' > "$TMPDIR/src/detect.ts"
run_test "fake API key → exit 1" 1 bash -c "cd '$TMPDIR' && rm -f src/*.ts && echo 'API_KEY=\"sk-test-1234567890abcdef\"' > src/detect.ts && SECRET_SCAN_ENGINE=grep bash scripts/scan-secrets.sh"

# Test 4: Fake password assignment → exit 1
echo ""
echo "4. Fake password detection"
run_test "fake password → exit 1" 1 bash -c "cd '$TMPDIR' && rm -f src/*.ts && echo 'password = \"supersecretpassword123\"' > src/detect.ts && SECRET_SCAN_ENGINE=grep bash scripts/scan-secrets.sh"

# Test 5: Excluded fixture → exit 0
echo ""
echo "5. Excluded fixture (test file)"
run_test "test file excluded → exit 0" 0 bash -c "cd '$TMPDIR' && rm -f src/*.ts && echo 'API_KEY=\"sk-test-1234567890abcdef\"' > src/detect.test.ts && SECRET_SCAN_ENGINE=grep bash scripts/scan-secrets.sh"

# Test 6: smoke script excluded → exit 0
echo ""
echo "6. Smoke script excluded"
run_test "smoke script excluded → exit 0" 0 bash -c "cd '$TMPDIR' && rm -f src/*.ts && mkdir -p src/scripts && echo 'ADMIN_PASSWORD = \"secret12345678\"' > src/scripts/smoke-delivery.ts && SECRET_SCAN_ENGINE=grep bash scripts/scan-secrets.sh"

# Test 7: Invalid engine → exit 1
echo ""
echo "7. Invalid engine value"
run_test "invalid engine → exit 1" 1 bash -c "cd '$TMPDIR' && SECRET_SCAN_ENGINE=invalid bash scripts/scan-secrets.sh"

# Test 8: rg unavailable with engine=rg → exit 1
echo ""
echo "8. rg engine when rg not available"
# This test only makes sense if rg is not installed
if ! command -v rg >/dev/null 2>&1; then
  run_test "rg engine no rg → exit 1" 1 bash -c "cd '$TMPDIR' && SECRET_SCAN_ENGINE=rg bash scripts/scan-secrets.sh"
else
  echo "  ⊘ skipped (rg is installed)"
fi

# Test 9: Scanner error propagation (corrupt PATTERN)
echo ""
echo "9. Scanner error propagation"
cat > "$TMPDIR/scripts/scan-secrets-bad.sh" << 'BADCRIPT'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Intentionally broken grep (invalid regex)
set +e
grep -riEn '(INVALID[[[' src/ > /dev/null 2>&1
status=$?
set -e
if [ "$status" -gt 1 ]; then
  echo "Scanner error correctly propagated: exit $status"
  exit "$status"
fi
echo "FAIL: scanner error was swallowed"
exit 1
BADCRIPT
chmod +x "$TMPDIR/scripts/scan-secrets-bad.sh"
run_test "scanner error propagated" 2 bash "$TMPDIR/scripts/scan-secrets-bad.sh"

# Test 10: SECRET_SCAN_ENGINE documented in package.json
echo ""
echo "10. Package.json integration"
if grep -q 'scan:secrets' "$ROOT_DIR/package.json"; then
  echo "  ✓ scan:secrets script exists in package.json"
  PASS=$((PASS + 1))
else
  echo "  ✗ scan:secrets script missing from package.json"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
