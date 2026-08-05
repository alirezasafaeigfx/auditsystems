# Agent Skills Integration Design

## Objective

Install and configure UI/UX Pro Max, Superpowers, and Marketing Skills for AuditSystems without global packages, floating references, hidden auto-updates, or unreviewed execution of third-party code.

## Architecture

Each upstream repository is a Git submodule pinned to a full commit SHA. Project-owned adapters expose the skills in Codex and agent-compatible locations while layering AuditSystems governance, evidence requirements, bilingual/RTL constraints, and production-safety boundaries. `skills-lock.json` is the machine-readable source of truth.

## Trust Boundaries

- Upstream directories are read-only vendor inputs.
- Root `AGENTS.md` and direct instructions override adapters and upstream skills.
- CI verifies gitlinks without initializing submodules, so third-party code is not executed during integrity checks.
- Initialization is explicit through `scripts/agent-skills.sh sync`.
- Updates are pull-request-only and require exact SHA review.

## Components

- `.gitmodules`: canonical repository URLs and paths.
- `skills-lock.json`: exact SHA, license, adapter, and required-file contract.
- `.codex/skills/ui-ux-pro-max/SKILL.md`: UI/UX activation and AuditSystems design constraints.
- `.agents/skills/auditsystems-superpowers/SKILL.md`: process adapter.
- `.agents/skills/auditsystems-marketing/SKILL.md`: evidence-safe marketing dispatcher.
- `.agents/product-marketing.md`: verified product context and explicit unknowns.
- `scripts/agent-skills.sh`: fail-closed sync, status, and verification.
- `scripts/tests/test-agent-skills-integrity.sh`: positive and tamper tests.
- `.github/workflows/agent-skills-integrity.yml`: isolated integrity gate.

## Error Handling

The verifier fails on malformed lock data, floating refs, non-HTTPS repositories, unsafe paths, missing adapters, missing gitlinks, wrong gitlink mode, SHA drift, or incomplete initialized submodules. Uninitialized submodules are accepted only for network-free verification; `sync` requires complete initialization.

## Testing

The integrity test creates a temporary Git repository, verifies the valid contract, and proves rejection of an insecure URL, a tampered gitlink, and a floating ref. CI runs both the verifier and tamper test without submodule initialization.

## Operational Policy

No production deployment, migration, restart, secret change, or application dependency change is part of this integration. Skill source upgrades are isolated reviewable changes and must not be coupled to application releases.
