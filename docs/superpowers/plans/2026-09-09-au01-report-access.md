# AU-01 Report Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one fail-closed authorization contract to every protected report delivery surface.

**Architecture:** Add a pure signed report-session helper and a localized challenge component. Consumers fetch share state first, reject expired/revoked shares, then require the report-bound session only when a password hash exists; PDF retains its stronger download-token/order entitlement.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Prisma, Node crypto.

**Spec:** `docs/superpowers/specs/2026-09-09-au01-report-access-design.md`

## Global Constraints

- No real customer data, schema changes, deployment, or infrastructure mutation.
- Protected data and credentials never enter URLs, logs, analytics, shared caches, or unauthorized bodies.
- Missing, malformed, expired, revoked, mismatched, unavailable, or contradictory evidence fails closed.

---

### Task 1: Signed report access credential

**Files:**
- Create: `src/lib/report-access.ts`
- Create: `src/lib/report-access.test.ts`
- Modify: `.env.example`

- [ ] Add failing tests for valid, absent, malformed, expired, mismatched, and missing-secret credentials.
- [ ] Implement HMAC-SHA256 report-bound credentials and secure cookie serialization.
- [ ] Run focused tests and mutation-check signature/report binding.

### Task 2: Enforce the shared decision at delivery surfaces

**Files:**
- Modify: `src/app/audit/r/[token]/page.tsx`
- Modify: `src/app/en/audit/r/[token]/page.tsx`
- Modify: `src/app/compare/[tokenA]/[tokenB]/page.tsx`
- Modify: `src/app/api/reports/[token]/route.ts`
- Modify: `src/app/api/reports/[token]/capture/route.ts`
- Create/modify focused tests beside these surfaces.
- Create: `src/components/ReportAccessChallenge.tsx`

- [ ] Preserve the demonstrated HTML leak as the first RED witness.
- [ ] Render a localized challenge before protected HTML/RSC content.
- [ ] Issue the credential only after correct password verification and accept it on later GET/capture/comparison requests.
- [ ] Verify public, authorized, absent, malformed, expired, revoked, mismatched, legacy, comparison, and PDF fixtures.
- [ ] Mutation-check the effective HTML authorization condition.

### Task 3: Verify and integrate

**Files:**
- Modify: `docs/reports/project-audit/2026-07-24/AUDIT_LEDGER.md`

- [ ] Run focused tests, local synthetic HTTP/browser checks, and all repository gates under Node 20.20.2/pnpm 9.15.0.
- [ ] Record factual AU-01 evidence and limitations in the ledger.
- [ ] Inspect the complete diff, request exact-head independent review, run hosted checks, and merge only if policy permits.

