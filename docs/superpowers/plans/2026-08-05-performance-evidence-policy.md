# Performance Evidence Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement truthful field/lab/diagnostic performance evidence and remove synthetic Core Web Vitals proxy claims.

**Architecture:** Add a bounded PageSpeed adapter with deterministic normalization and cache metadata, build local diagnostics separately, persist the combined bundle in the existing summary JSON, and render report-safe evidence wording. No new database table or live provider activation is required.

**Tech Stack:** TypeScript 6 strict, Next.js 16, Node HTTP transport, Vitest 4, Prisma JSON summary, pdf-lib.

## Global Constraints

- Never map diagnostics or Lighthouse TBT to LCP, INP, or CLS field metrics.
- Never treat missing/unavailable provider evidence as passing.
- Never include `PAGESPEED_API_KEY` in URLs retained as raw references, logs, summaries, or cache keys.
- QUICK allows one mobile provider request; DEEP allows at most mobile plus desktop.
- Field TTL is 24 hours; lab TTL is 6 hours.
- Do not perform a live provider request, production deployment, credential mutation, billing activation, or database migration.

---

### Task 1: RED provider-policy tests

**Files:**
- Create: `src/lib/performance-evidence.test.ts`
- Modify: `src/lib/rules.test.ts`
- Modify: `src/lib/safeAuditFetch.test.ts`
- Modify: `src/lib/summary.test.ts`
- Modify: `src/lib/pdf.test.ts`

- [ ] Prove missing API key returns `UNAVAILABLE` without calling fetch.
- [ ] Prove valid CrUX LCP/INP/CLS are `MEASURED` and valid Lighthouse metrics are `OBSERVED`.
- [ ] Prove Lighthouse TBT is not serialized as INP.
- [ ] Prove mobile and desktop strategies remain distinct.
- [ ] Prove partial, 429, unauthorized, timeout, invalid JSON, oversized response, redirect final URL, and stale cache behavior.
- [ ] Prove diagnostics do not emit legacy `CWV_*` findings or CWV pass/fail wording.
- [ ] Prove TTFB and total response time are measured separately.
- [ ] Prove summary and PDF formatter retain classification, status, coverage, confidence, limitations, and unavailable wording.
- [ ] Commit RED tests and record exact failure evidence.

### Task 2: Provider and diagnostics implementation

**Files:**
- Create: `src/lib/performance-evidence.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/rules.ts`
- Modify: `src/lib/safeAuditFetch.ts`

- [ ] Define serializable provider, metric, diagnostic, coverage, and bundle types.
- [ ] Validate requested URLs and enforce timeout/byte/request budgets.
- [ ] Normalize PageSpeed HTTP and payload outcomes to the explicit status enum.
- [ ] Parse CrUX and Lighthouse metrics without cross-class substitution.
- [ ] Add deterministic TTL, cache identity, and stale detection.
- [ ] Build observed diagnostics with no CWV metric keys.
- [ ] Replace legacy CWV proxy emission with diagnostic risk findings while retaining legacy type compatibility.

### Task 3: Summary and worker round trip

**Files:**
- Modify: `src/lib/summary.types.ts`
- Modify: `src/lib/summary.ts`
- Modify: `src/worker/audit.handler.ts`

- [ ] Persist the performance bundle inside `AuditSummaryV1`.
- [ ] Measure real header-arrival TTFB and total response duration separately.
- [ ] Collect mobile only for QUICK and mobile plus desktop for DEEP.
- [ ] Skip all provider network calls when `PAGESPEED_API_KEY` is absent.
- [ ] Keep the legacy numeric score unchanged except for removal of misleading positive/negative CWV proxy findings.

### Task 4: PDF report-safe rendering

**Files:**
- Modify: `src/lib/pdf.ts`
- Modify: `src/app/api/pdf/[token]/route.ts`

- [ ] Add a pure formatter for performance evidence lines.
- [ ] Render field and lab labels, status, coverage, confidence, collection time, and limitations.
- [ ] Render unavailable metrics as unavailable with a next action, never good/poor.
- [ ] Read performance evidence from persisted summary using a fail-closed shape guard.

### Task 5: Documentation and verification

**Files:**
- Modify: `.env.example`
- Create: `docs/security/PERFORMANCE_PROVIDER_POLICY.md`

- [ ] Document optional `PAGESPEED_API_KEY`, request budgets, TTL, and no-key behavior.
- [ ] Document field/lab/diagnostic distinctions and unsupported substitutions.
- [ ] Run focused tests, main-gate, docs, and roadmap on exact head.
- [ ] Verify zero-behind, mergeability, and zero unresolved review threads.
- [ ] Merge with `expected_head_sha` and update Issues #33 and #31 with exact evidence.
