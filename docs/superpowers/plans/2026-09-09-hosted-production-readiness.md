# Hosted Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the portable production-readiness check to GitHub-hosted capacity and prevent regression.

**Architecture:** Reuse the repository's executable runner-contract shell gate. Add the scheduled readiness job to its hosted-runner assertions, then make the single workflow runner change required to satisfy the contract.

**Tech Stack:** GitHub Actions YAML, Bash, pnpm repository gates

**Spec:** `docs/superpowers/specs/2026-09-09-hosted-production-readiness-design.md`

## Global Constraints

- Base the work on current `origin/main` in an isolated feature worktree.
- Do not change `deploy-vps-manual.yml` or `nightly-audit.yml`.
- Do not deploy, migrate data, or alter secrets or infrastructure.
- Keep actions pinned and preserve the lockfile.

---

### Task 1: Enforce and satisfy the hosted readiness contract

**Files:**
- Modify: `scripts/tests/test-required-pr-workflows-runner.sh`
- Modify: `.github/workflows/production-readiness.yml`
- Create: `docs/superpowers/specs/2026-09-09-hosted-production-readiness-design.md`
- Create: `docs/superpowers/plans/2026-09-09-hosted-production-readiness.md`

**Interfaces:**
- Consumes: workflow job identifiers and runner declarations in `.github/workflows/*.yml`
- Produces: a zero/nonzero executable contract used by `.github/workflows/main-gate.yml`

- [ ] **Step 1: Add the failing contract case**

Add `production-readiness.yml:readiness` to the workflows whose selected job must contain the exact line `runs-on: ubuntu-latest`, without requiring this scheduled/manual workflow to gain a pull-request trigger.

- [ ] **Step 2: Verify RED**

Run: `bash scripts/tests/test-required-pr-workflows-runner.sh`

Expected: exit 1 with `production-readiness.yml job readiness has no exact hosted runner strategy`.

- [ ] **Step 3: Apply the minimal workflow correction**

Replace only the readiness job's `runs-on: [self-hosted, linux, x64, asdev-ci]` with `runs-on: ubuntu-latest`.

- [ ] **Step 4: Verify focused GREEN and mutation behavior**

Run the contract script and expect exit 0. Temporarily restore the old runner line, rerun and expect exit 1, then restore the fix and expect exit 0.

- [ ] **Step 5: Run repository gates**

Run every command required by `AGENTS.md`, inspect the full diff, and prove the two excluded workflows and lockfile are unchanged.

- [ ] **Step 6: Publish reviewable evidence**

Commit conventionally, push the feature branch, create a focused PR, inspect hosted checks, and request a manual `production-readiness` run on the exact PR head SHA. Record any infrastructure or permission blocker precisely.
