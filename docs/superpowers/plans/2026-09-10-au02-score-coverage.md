# AU-02 Score and Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make score, processing state, coverage, and availability truthful and consistent across every report delivery surface.

**Architecture:** Add one pure result resolver over stored summary plus findings, persist explicit coverage for new worker results, and make HTML/API/comparison/PDF consume that resolver. Historical JSON remains unchanged and is adapted at read time.

**Tech Stack:** TypeScript 6, Next.js 16 App Router, Prisma JSON summaries, Vitest 4, pdf-lib.

**Spec:** `docs/superpowers/specs/2026-09-10-au02-score-coverage-design.md`

## Global Constraints

- Preserve existing score weights, grade thresholds, rounding, AU-01 authorization, SSRF controls, and historical records.
- Do not migrate a database, update dependencies, or mutate Production/staging infrastructure.
- Fail closed for malformed, unsupported, unavailable, stale, or contradictory result evidence.

---

### Task 1: Canonical result assessment

**Files:**
- Create: `src/lib/report-result.ts`
- Create: `src/lib/report-result.test.ts`
- Modify: `src/lib/summary.types.ts`
- Modify: `src/lib/summary.ts`
- Modify: `src/worker/audit.handler.ts`

**Interfaces:**
- Produces: `resolveReportResult({ summary, findings, runStatus })` and a versioned `resultCoverage` summary field.

- [ ] Add fixture tests for complete, partial, unavailable, failed, mixed, missing, empty, malformed, unsupported, legacy, contradictory, and duplicate inputs.
- [ ] Run the focused test and confirm the current implementation is RED because no canonical resolver exists.
- [ ] Implement the minimal pure resolver and worker summary coverage serialization.
- [ ] Run focused tests and confirm GREEN.

### Task 2: Align delivery surfaces

**Files:**
- Modify: `src/app/audit/r/[token]/page.tsx` and English equivalent
- Modify: `src/app/api/reports/[token]/route.ts`
- Modify: `src/lib/audit-comparison.ts` and comparison page
- Modify: `src/app/api/pdf/[token]/route.ts`
- Modify: `src/lib/pdf.ts`
- Test: existing colocated report/API/comparison/PDF tests

**Interfaces:**
- Consumes: the canonical result assessment from Task 1.
- Produces: equivalent human- and machine-readable availability semantics.

- [ ] Add RED surface tests proving partial/failed/legacy data cannot appear as a complete perfect result.
- [ ] Route each surface through the shared resolver and add localized labels without changing access behavior.
- [ ] Confirm GREEN across FA/EN HTML, API, comparison, and PDF fixtures.
- [ ] Mutate the resolver's withholding branch, prove the regression returns RED, then restore it.

### Task 3: Evidence, advisory, and integration

**Files:**
- Modify: `docs/reports/project-audit/2026-07-24/AUDIT_LEDGER.md`
- Create or update: one GitHub advisory follow-up issue when no dedicated issue exists.

**Interfaces:**
- Produces: factual AU-02 ledger evidence and exact advisory disposition.

- [ ] Run focused tests, `pnpm check`, secret scan, pinned Actions validation, and applicable hosted PostgreSQL checks.
- [ ] Inspect the complete base-to-head diff and verify no lockfile, infrastructure, customer-data, or generated-file churn.
- [ ] Request independent exact-SHA review, address valid findings, and merge the focused PR only when policy permits.
