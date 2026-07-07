#!/bin/bash
# Comprehensive smoke test script for all critical ASDEV Audit paths
# Usage: ./smoke-full.sh [BASE_URL]
set -euo pipefail

BASE_URL="${1:-https://audit.alirezasafaeisystems.ir}"
PASS=0
FAIL=0
ERRORS=()

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
  local path="$1"
  local expected="$2"
  local desc="$3"
  local url="${BASE_URL}${path}"
  local status

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} ${desc} (${path}) -> ${status}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} ${desc} (${path}) -> ${status} (expected ${expected})"
    FAIL=$((FAIL + 1))
    ERRORS+=("${desc}: ${status} != ${expected}")
  fi
}

check_post() {
  local path="$1"
  local expected="$2"
  local desc="$3"
  local data="$4"
  local url="${BASE_URL}${path}"
  local status

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} ${desc} (${path}) -> ${status}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} ${desc} (${path}) -> ${status} (expected ${expected})"
    FAIL=$((FAIL + 1))
    ERRORS+=("${desc}: ${status} != ${expected}")
  fi
}

check_post_any() {
  local path="$1"
  local expected_list="$2"
  local desc="$3"
  local data="$4"
  local url="${BASE_URL}${path}"
  local status
  local found=0

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo "000")

  IFS=',' read -ra EXPECTED_ARR <<< "$expected_list"
  for exp in "${EXPECTED_ARR[@]}"; do
    if [ "$status" = "$exp" ]; then
      found=1
      break
    fi
  done

  if [ "$found" -eq 1 ]; then
    echo -e "  ${GREEN}✓${NC} ${desc} (${path}) -> ${status}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} ${desc} (${path}) -> ${status} (expected ${expected_list})"
    FAIL=$((FAIL + 1))
    ERRORS+=("${desc}: ${status} != (${expected_list})")
  fi
}

echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}        ASDEV Audit Systems - Comprehensive Smoke Test${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Target: ${YELLOW}${BASE_URL}${NC}"
echo ""

echo -e "${YELLOW}▶ Public Pages:${NC}"
check "/" "200" "Homepage"
check "/audit" "200" "Audit form page"
check "/sample-report" "200" "Sample report page"
check "/pricing" "200" "Pricing page"
check "/login" "200" "Login page"
check "/signup" "200" "Signup page"
echo ""

echo -e "${YELLOW}▶ API Health & Readiness:${NC}"
check "/api/health" "200" "API health check"
check "/api/ready" "200" "API ready check"
echo ""

echo -e "${YELLOW}▶ API Auth & Security:${NC}"
check "/api/csrf" "200" "CSRF token endpoint"
check "/api/stats" "200" "Stats endpoint (public)"
check "/api/billing/current" "401" "Billing endpoint (unauth required)"
echo ""

echo -e "${YELLOW}▶ Report Access:${NC}"
check "/api/reports/invalid-token-12345" "404" "Report with invalid token"
echo ""

echo -e "${YELLOW}▶ Audit API:${NC}"
check_post_any "/api/audit/runs" "200,403" "Audit run creation endpoint" '{"url":"https://example.com","depth":"QUICK"}'
echo ""

echo -e "${YELLOW}▶ Internationalization:${NC}"
check "/en/sample-report" "200" "Sample report (EN)"
check "/en/audit" "200" "Audit page (EN)"
check "/en/pricing" "200" "Pricing page (EN)"
echo ""

echo -e "${YELLOW}▶ App Routes:${NC}"
check "/app" "307" "App redirect (unauthenticated)"
echo ""

echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      Results Summary${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed: ${PASS}${NC}"
echo -e "  ${RED}Failed: ${FAIL}${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}⚠ Failed tests:${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}• ${err}${NC}"
  done
  echo ""
  echo -e "${RED}❌ Smoke test FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All smoke tests PASSED${NC}"
  exit 0
fi
