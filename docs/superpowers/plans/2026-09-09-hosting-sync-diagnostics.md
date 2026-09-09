# Hosting Sync Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct false hosting-sync findings while preserving fail-closed evidence classification.

**Architecture:** Keep the existing shell entrypoint and output contract. Add deterministic command fixtures, replace the undeclared search dependency with POSIX tooling, classify command failures explicitly, and retain unresolved infrastructure findings in issue #12.

**Tech Stack:** Bash, GitHub Actions, pnpm repository gates

**Spec:** `docs/superpowers/specs/2026-09-09-hosting-sync-diagnostics-design.md`

## Global Constraints

- Work from `GITHUB_MAIN` SHA `036eaec67456243c29ccea51bee10c5e53ac3cb7` in an isolated worktree.
- Do not deploy or mutate DNS, Nginx, firewall, VPS configuration, databases, runners, secrets, payments, or services.
- Do not change the `3010`/`3011` portable defaults or infer the active deployed SHA.
- Missing, malformed, or contradictory evidence must remain visible and fail closed.

---

### Task 1: Correct hosting-sync evidence classification

**Files:**
- Create: `scripts/tests/test-hosting-sync.sh`
- Modify: `scripts/deploy/check-hosting-sync.sh`
- Modify: `.github/workflows/main-gate.yml`

**Interfaces:**
- Consumes: repository deploy/template files and `dig`, `ss`, `curl`, `grep`
- Produces: accurate `[OK]`, `[WARN]`, and `[FAIL]` records plus a zero/nonzero process result

- [ ] **Step 1: Add a deterministic regression test**

Create fixtures for successful DNS/HTTP/socket probes while an `rg` shim exits 127, then assert all repository literals and the production A record pass. Add failing fixtures for unavailable DNS and socket evidence.

- [ ] **Step 2: Verify RED**

Run `bash scripts/tests/test-hosting-sync.sh` and expect exit 1 because the current implementation calls `rg` and retains the stale production A-record expectation.

- [ ] **Step 3: Apply the smallest correction**

Use `grep -F` for local content/socket checks, capture tool exit codes, emit explicit evidence-unavailable failures, and update the production A-record default from the current governance source.

- [ ] **Step 4: Verify GREEN and mutation sensitivity**

Run the focused test successfully, temporarily restore one real defect at a time, verify the test fails, restore the correction, and verify it passes again.

- [ ] **Step 5: Wire and verify the required gate**

Add the focused test to the existing release-safety step in `main-gate.yml`, then run the focused test and complete repository-required gates with Node 20.20.2 and pnpm 9.15.0.

### Task 2: Publish factual evidence

**Files:**
- Modify: `docs/reports/project-audit/2026-07-24/AUDIT_LEDGER.md`

**Interfaces:**
- Consumes: issue #12, final PR/check URLs, read-only probe timestamps
- Produces: separate repository, topology, infrastructure, staging, Production, deployment, and durability verdicts

- [ ] **Step 1: Record the diagnostic checkpoint**

Append the verified causes, verdict boundaries, issue link, PR link, and explicit no-mutation statement without replacing the historical July ledger.

- [ ] **Step 2: Inspect and publish**

Inspect the complete base-to-head diff, request independent review, push one dedicated branch, create one PR, and merge only if current policy and exact-head checks authorize it.
