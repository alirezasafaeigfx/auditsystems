#!/bin/bash

echo "=== AuditSystems Dev Check ==="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass=0
fail=0

run_check() {
  local name="$1"
  local cmd="$2"
  printf "%-25s" "$name"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    pass=$((pass + 1))
  else
    echo -e "${RED}FAIL${NC}"
    fail=$((fail + 1))
  fi
}

run_check "lint" "pnpm lint"
run_check "typecheck" "pnpm typecheck"
run_check "tests" "pnpm test"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}$pass passed${NC}, ${RED}$fail failed${NC}"

if [ "$fail" -gt 0 ]; then
  echo -e "${RED}Fix failures before committing.${NC}"
  exit 1
fi

echo -e "${GREEN}All checks passed!${NC}"
