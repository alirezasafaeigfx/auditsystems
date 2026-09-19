#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const { execFileSync } = require('node:child_process')

const raw = execFileSync(
  'pnpm',
  ['list', 'deepmerge-ts', '--prod', '--depth', '100', '--json'],
  { encoding: 'utf8' },
)
const graph = JSON.parse(raw)
const versions = new Set()

function walk(node) {
  if (!node || typeof node !== 'object') return
  const direct = node.dependencies?.['deepmerge-ts']
  if (direct && typeof direct.version === 'string') versions.add(direct.version)
  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const deps = node[group]
    if (!deps || typeof deps !== 'object') continue
    for (const dep of Object.values(deps)) walk(dep)
  }
}
for (const root of graph) walk(root)

if (versions.size === 0) {
  console.error('deepmerge-ts not found in resolved production graph')
  process.exit(1)
}

const vulnerable = [...versions].filter((version) => {
  const match = version.match(/^(\d+)\./)
  return !match || Number(match[1]) < 8
})

if (vulnerable.length) {
  console.error(`vulnerable deepmerge-ts versions resolved: ${vulnerable.join(', ')}`)
  process.exit(1)
}
console.log(`deepmerge-ts production graph patched: ${[...versions].join(', ')}`)
NODE
