#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "agent-skills: must run inside a Git repository" >&2
  exit 2
fi

LOCK_FILE="$ROOT/skills-lock.json"
GITMODULES_FILE="$ROOT/.gitmodules"
COMMAND="${1:-verify}"

fail() {
  echo "agent-skills: $*" >&2
  exit 1
}

require_tool() {
  command -v "$1" >/dev/null 2>&1 || fail "required tool is missing: $1"
}

validate_lock() {
  [[ -f "$LOCK_FILE" ]] || fail "missing skills-lock.json"
  [[ -f "$GITMODULES_FILE" ]] || fail "missing .gitmodules"

  node - "$LOCK_FILE" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const lock = JSON.parse(fs.readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
if (lock.schemaVersion !== 1) fail('schemaVersion must be 1');
if (!lock.policy || lock.policy.allowFloatingRefs !== false) fail('floating refs must be disabled');
if (lock.policy.allowGlobalInstall !== false) fail('global installs must be disabled');
if (lock.policy.updateMode !== 'pull-request-only') fail('updates must be pull-request-only');
if (!Array.isArray(lock.sources) || lock.sources.length !== 3) fail('exactly three sources are required');
const ids = new Set();
const paths = new Set();
for (const source of lock.sources) {
  if (!/^[a-z0-9-]+$/.test(source.id)) fail(`invalid source id: ${source.id}`);
  if (ids.has(source.id)) fail(`duplicate source id: ${source.id}`);
  ids.add(source.id);
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(source.repository)) {
    fail(`repository must be an HTTPS GitHub URL: ${source.id}`);
  }
  if (!/^[0-9a-f]{40}$/.test(source.commit)) fail(`commit must be a full SHA-1: ${source.id}`);
  if (typeof source.path !== 'string' || source.path.startsWith('/') || source.path.includes('..')) {
    fail(`unsafe source path: ${source.id}`);
  }
  if (paths.has(source.path)) fail(`duplicate source path: ${source.path}`);
  paths.add(source.path);
  if (source.license !== 'MIT') fail(`unexpected license: ${source.id}`);
  if (typeof source.adapter !== 'string' || source.adapter.startsWith('/') || source.adapter.includes('..')) {
    fail(`unsafe adapter path: ${source.id}`);
  }
  if (!Array.isArray(source.requiredFiles) || source.requiredFiles.length === 0) {
    fail(`requiredFiles must be non-empty: ${source.id}`);
  }
  for (const required of source.requiredFiles) {
    if (typeof required !== 'string' || required.startsWith('/') || required.includes('..')) {
      fail(`unsafe required file path: ${source.id}`);
    }
  }
}
NODE
}

is_initialized_submodule() {
  local module_path="$1"
  [[ -d "$ROOT/$module_path" ]] || return 1

  local module_top expected_top resolved_top
  module_top="$(git -C "$ROOT/$module_path" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$module_top" ]] || return 1
  expected_top="$(cd "$ROOT/$module_path" && pwd -P)"
  resolved_top="$(cd "$module_top" && pwd -P)"
  [[ "$resolved_top" == "$expected_top" ]]
}

source_rows() {
  node - "$LOCK_FILE" <<'NODE'
const fs = require('node:fs');
const lock = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const source of lock.sources) {
  process.stdout.write([
    source.id,
    source.repository,
    source.commit,
    source.path,
    source.adapter,
    source.requiredFiles.join('|')
  ].join('\t') + '\n');
}
NODE
}

verify_source() {
  local require_initialized="$1"
  local id="$2"
  local repository="$3"
  local expected_sha="$4"
  local module_path="$5"
  local adapter="$6"
  local required_joined="$7"

  local configured_path configured_url index_line mode actual_sha stage indexed_path
  configured_path="$(git config -f "$GITMODULES_FILE" --get "submodule.${module_path}.path" || true)"
  configured_url="$(git config -f "$GITMODULES_FILE" --get "submodule.${module_path}.url" || true)"
  [[ "$configured_path" == "$module_path" ]] || fail "$id: .gitmodules path mismatch"
  [[ "$configured_url" == "$repository" ]] || fail "$id: .gitmodules URL mismatch"

  index_line="$(git -C "$ROOT" ls-files --stage -- "$module_path")"
  [[ -n "$index_line" ]] || fail "$id: gitlink is missing from the index"
  read -r mode actual_sha stage indexed_path <<<"$index_line"
  [[ "$mode" == "160000" ]] || fail "$id: expected gitlink mode 160000, got $mode"
  [[ "$stage" == "0" ]] || fail "$id: expected stage 0, got $stage"
  [[ "$indexed_path" == "$module_path" ]] || fail "$id: indexed path mismatch"
  [[ "$actual_sha" == "$expected_sha" ]] || fail "$id: gitlink SHA mismatch ($actual_sha)"
  [[ -f "$ROOT/$adapter" ]] || fail "$id: adapter is missing: $adapter"

  if is_initialized_submodule "$module_path"; then
    local checked_out_sha
    checked_out_sha="$(git -C "$ROOT/$module_path" rev-parse HEAD)"
    [[ "$checked_out_sha" == "$expected_sha" ]] || fail "$id: checked-out SHA mismatch ($checked_out_sha)"
    IFS='|' read -r -a required_files <<<"$required_joined"
    for required_file in "${required_files[@]}"; do
      [[ -f "$ROOT/$module_path/$required_file" ]] || fail "$id: missing upstream file: $required_file"
    done
    echo "verified $id @ $expected_sha (initialized)"
  else
    [[ "$require_initialized" != "true" ]] || fail "$id: submodule is not initialized; run scripts/agent-skills.sh sync"
    echo "verified $id @ $expected_sha (gitlink only)"
  fi
}

verify_all() {
  local require_initialized="${1:-false}"
  validate_lock
  while IFS=$'\t' read -r id repository commit module_path adapter required_files; do
    verify_source "$require_initialized" "$id" "$repository" "$commit" "$module_path" "$adapter" "$required_files"
  done < <(source_rows)
}

sync_all() {
  verify_all false
  git -C "$ROOT" submodule sync --recursive
  git -C "$ROOT" -c protocol.file.allow=never submodule update --init --recursive --depth 1
  verify_all true
}

status_all() {
  validate_lock
  while IFS=$'\t' read -r id repository commit module_path adapter required_files; do
    local_state="not-initialized"
    if is_initialized_submodule "$module_path"; then
      local_state="$(git -C "$ROOT/$module_path" rev-parse --short=12 HEAD)"
    fi
    printf '%-22s %s expected=%s local=%s\n' "$id" "$module_path" "${commit:0:12}" "$local_state"
  done < <(source_rows)
}

require_tool git
require_tool node

case "$COMMAND" in
  verify)
    verify_all false
    ;;
  sync)
    sync_all
    ;;
  status)
    status_all
    ;;
  *)
    fail "usage: scripts/agent-skills.sh {verify|sync|status}"
    ;;
esac
