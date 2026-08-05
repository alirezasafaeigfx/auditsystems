# Agent Skills Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reproducible, project-local UI/UX, engineering-process, and marketing skills with exact upstream pins and fail-closed verification.

**Architecture:** Store upstream repositories as immutable Git submodules, expose project-owned adapters, and verify the lock/gitlink contract without executing third-party code in CI. Keep all updates pull-request-only.

**Tech Stack:** Git submodules, Bash, Node.js 22, GitHub Actions, Agent Skills markdown.

## Global Constraints

- No global installs.
- No floating branches or tags.
- Root `AGENTS.md` and direct instructions override upstream skills.
- Third-party code is not executed by the integrity workflow.
- No production mutation is included.

---

### Task 1: Provenance and immutable sources

**Files:**
- Create: `.gitmodules`
- Create: `skills-lock.json`
- Create: `docs/agent-skills/THIRD_PARTY_NOTICES.md`
- Add gitlinks: `.vendor/skills/ui-ux-pro-max`, `.vendor/skills/superpowers`, `.agents/marketingskills`

- [x] Pin each source to a reviewed 40-character commit SHA.
- [x] Record HTTPS URL, path, license, adapter, and required files.
- [x] Configure detached checkout with no branch tracking.

### Task 2: Project adapters and context

**Files:**
- Create: `.codex/skills/ui-ux-pro-max/SKILL.md`
- Create: `.agents/skills/auditsystems-superpowers/SKILL.md`
- Create: `.agents/skills/auditsystems-marketing/SKILL.md`
- Create: `.agents/product-marketing.md`

- [x] Define activation and precedence.
- [x] Add AuditSystems UI, RTL, accessibility, evidence, privacy, and production-safety constraints.
- [x] Record unknown marketing inputs instead of fabricating them.

### Task 3: Fail-closed verifier

**Files:**
- Create: `scripts/agent-skills.sh`
- Test: `scripts/tests/test-agent-skills-integrity.sh`

- [x] Validate lock schema, URLs, SHAs, paths, adapters, gitlink modes, and gitlink SHAs.
- [x] Verify initialized upstream HEADs and required files.
- [x] Add explicit sync and status commands.
- [x] Prove rejection of insecure URLs, SHA tampering, and floating refs.

### Task 4: CI and documentation

**Files:**
- Create: `.github/workflows/agent-skills-integrity.yml`
- Create: `docs/agent-skills/README.md`
- Modify: `AGENTS.md`

- [x] Run integrity checks without initializing submodules.
- [x] Pin all GitHub Actions to immutable SHAs.
- [x] Document initialization, verification, and upgrade workflow.
- [x] Add project governance and skill precedence to `AGENTS.md`.

### Task 5: Verification and merge gate

- [x] Run Bash syntax checks.
- [x] Run integrity tamper tests.
- [ ] Create the feature commit and pull request from current `main`.
- [ ] Confirm the exact PR head SHA and required workflow results.
- [ ] Merge only with an unchanged head, successful checks, and no unresolved review threads.
