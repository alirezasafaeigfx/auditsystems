#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

fixture="$TMP_ROOT/repo"
mkdir -p "$fixture/scripts" "$fixture/.codex/skills/ui-ux-pro-max" \
  "$fixture/.agents/skills/auditsystems-marketing" \
  "$fixture/.agents/skills/auditsystems-superpowers"
cp "$SOURCE_ROOT/scripts/agent-skills.sh" "$fixture/scripts/agent-skills.sh"
cp "$SOURCE_ROOT/skills-lock.json" "$fixture/skills-lock.json"
cp "$SOURCE_ROOT/.gitmodules" "$fixture/.gitmodules"
printf '%s\n' 'adapter' > "$fixture/.codex/skills/ui-ux-pro-max/SKILL.md"
printf '%s\n' 'adapter' > "$fixture/.agents/skills/auditsystems-marketing/SKILL.md"
printf '%s\n' 'adapter' > "$fixture/.agents/skills/auditsystems-superpowers/SKILL.md"

git -C "$fixture" init -q
git -C "$fixture" config user.email tests@example.invalid
git -C "$fixture" config user.name tests
git -C "$fixture" add .gitmodules skills-lock.json scripts/agent-skills.sh \
  .codex/skills/ui-ux-pro-max/SKILL.md \
  .agents/skills/auditsystems-marketing/SKILL.md \
  .agents/skills/auditsystems-superpowers/SKILL.md

node - "$fixture/skills-lock.json" "$fixture" <<'NODE'
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const lock = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cwd = process.argv[3];
for (const source of lock.sources) {
  const result = spawnSync('git', ['update-index', '--add', '--cacheinfo', `160000,${source.commit},${source.path}`], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `failed to add ${source.path}`);
}
NODE

git -C "$fixture" commit -qm 'test fixture'

# actions/checkout creates empty gitlink directories even when submodules are disabled.
mkdir -p "$fixture/.vendor/skills/ui-ux-pro-max" \
  "$fixture/.vendor/skills/superpowers" \
  "$fixture/.agents/marketingskills"

(cd "$fixture" && bash scripts/agent-skills.sh verify >/dev/null)

cp "$fixture/.gitmodules" "$TMP_ROOT/gitmodules.good"
sed -i 's#https://github.com/obra/superpowers.git#http://github.com/obra/superpowers.git#' "$fixture/.gitmodules"
if (cd "$fixture" && bash scripts/agent-skills.sh verify >/dev/null 2>&1); then
  echo 'expected non-HTTPS repository URL to fail' >&2
  exit 1
fi
cp "$TMP_ROOT/gitmodules.good" "$fixture/.gitmodules"

git -C "$fixture" update-index --cacheinfo 160000,1111111111111111111111111111111111111111,.vendor/skills/superpowers
if (cd "$fixture" && bash scripts/agent-skills.sh verify >/dev/null 2>&1); then
  echo 'expected tampered gitlink to fail' >&2
  exit 1
fi
git -C "$fixture" update-index --cacheinfo 160000,44c9b2d6e889982ac18c27d05a19fefe335194e1,.vendor/skills/superpowers

node - "$fixture/skills-lock.json" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const lock = JSON.parse(fs.readFileSync(path, 'utf8'));
lock.sources[0].commit = 'main';
fs.writeFileSync(path, JSON.stringify(lock, null, 2) + '\n');
NODE
if (cd "$fixture" && bash scripts/agent-skills.sh verify >/dev/null 2>&1); then
  echo 'expected floating ref to fail' >&2
  exit 1
fi

echo 'agent skills integrity tests passed'
