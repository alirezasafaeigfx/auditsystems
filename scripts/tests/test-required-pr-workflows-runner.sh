#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for specification in main-gate.yml:gate docs-automation.yml:docs roadmap-automation.yml:roadmap; do
  workflow="${specification%%:*}"
  job="${specification##*:}"
  path="$REPO_ROOT/.github/workflows/$workflow"
  grep -q 'pull_request:' "$path" || { echo "$workflow must run for pull requests" >&2; exit 1; }
  job_block="$(awk -v job="$job" '
    $0 == "  " job ":" { inside=1 }
    inside && $0 ~ /^  [A-Za-z0-9_-]+:$/ && $0 != "  " job ":" { exit }
    inside { print }
  ' "$path")"
  printf '%s\n' "$job_block" | grep -qx '    runs-on: ubuntu-latest' || {
    echo "$workflow job $job has no exact hosted runner strategy" >&2
    exit 1
  }
done

echo "required PR workflow runner contract: PASS"
