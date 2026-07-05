#!/bin/bash
# Smoke test script for public routes
# Usage: ./smoke-public-routes.sh [BASE_URL]
set -euo pipefail

BASE_URL="${1:-https://audit.alirezasafaeisystems.ir}"
PASS=0
FAIL=0

check() {
  local path="$1"
  local expected="$2"
  local desc="$3"
  local url="${BASE_URL}${path}"
  local status

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected" ]; then
    echo "  ✓ ${desc} (${path}) -> ${status}"
    PASS=$((PASS + 1))
  else
    echo "  ✗ ${desc} (${path}) -> ${status} (expected ${expected})"
    FAIL=$((FAIL + 1))
  fi
}

echo "Running smoke tests against ${BASE_URL}"
echo ""

echo "Public routes:"
check "/" "200" "Homepage"
check "/signup" "200" "Signup page"
check "/login" "200" "Login page"
check "/app" "307" "App redirect unauthenticated"
check "/audit" "200" "Audit page"
check "/pricing" "200" "Pricing page"
echo ""

echo "API routes:"
check "/api/csrf" "200" "CSRF token endpoint"
check "/api/ready" "200" "Health check endpoint"
check "/api/health" "200" "Health endpoint"
echo ""

echo "Revenue routes (unauthenticated):"
check "/api/billing/current" "401" "Billing current (unauth)"
echo ""

echo "Results: ${PASS} passed, ${FAIL} failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
