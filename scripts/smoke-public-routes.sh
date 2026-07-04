#!/bin/bash
# Smoke test script for public routes
# Usage: ./smoke-public-routes.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-https://audit.alirezasafaeisystems.ir}"
FAIL=0

check_route() {
    local path="$1"
    local expected_code="$2"
    local description="$3"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_code" ]; then
        echo "PASS  $path -> $response ($description)"
    else
        echo "FAIL  $path -> $response (expected $expected_code) ($description)"
        FAIL=1
    fi
}

echo "=== Smoke Test: Public Routes ==="
echo "Base URL: ${BASE_URL}"
echo ""

check_route "/" "200" "Homepage"
check_route "/signup" "200" "Signup page"
check_route "/login" "200" "Login page"
check_route "/app" "307" "App redirect (unauthenticated)"
check_route "/api/csrf" "200" "CSRF token endpoint"
check_route "/audit" "200" "Audit page"
check_route "/pricing" "200" "Pricing page"
check_route "/api/ready" "200" "Health check endpoint"

echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "=== ALL TESTS PASSED ==="
    exit 0
else
    echo "=== SOME TESTS FAILED ==="
    exit 1
fi
