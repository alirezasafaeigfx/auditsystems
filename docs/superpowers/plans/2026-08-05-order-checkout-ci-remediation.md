# Order Checkout CI Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebase the payment-integrity work on current `main`, restore Prisma migration parity, and enforce fail-closed handling of ambiguous external checkout outcomes.

**Architecture:** Preserve the existing atomic order and callback-fencing design. Add one forward-only reconciliation migration for the missing nullable lead relation, classify checkout initialization failures at the handler boundary, and keep ambiguous external outcomes in `PENDING` with a durable provider-request marker so retries require reconciliation.

**Tech Stack:** Next.js 16, TypeScript 6 strict, Prisma 6.19, PostgreSQL 16, Vitest 4, GitHub Actions.

## Global Constraints

- Do not deploy, run production migrations, invoke live payments, mutate secrets, or restart services.
- Keep the public API generic; do not expose provider, token, callback, database, or CSRF diagnostics.
- Write the provider-request marker before any external checkout call.
- Only deterministic preflight and provider 4xx failures may transition the order to `FAILED`.
- Timeout, network, provider 5xx, unknown transport state, and post-provider persistence failures must remain `PENDING` and return reconciliation-required.
- All branch updates must be fast-forward and all merges must use exact-head protection.

---

### Task 1: Rebase the PR content on current main

**Files:**
- Preserve the 17 files already changed by PR #87.
- Create: `docs/superpowers/plans/2026-08-05-order-checkout-ci-remediation.md`

**Interfaces:**
- Consumes: PR head `99d612bdfbce1119541bff7544402bf478f19d79` and current main `f93ac5030c04f4becd71dc62d1cda91810b88787`.
- Produces: a merge commit whose first parent is the prior PR head and whose second parent is current main.

- [ ] Build a tree from current main and overlay only the 17 PR paths.
- [ ] Create a two-parent commit so the PR branch update remains fast-forward.
- [ ] Verify `compare main...head` reports zero commits behind.

### Task 2: Establish failing coverage for ambiguous provider outcomes

**Files:**
- Modify: `src/lib/order-checkout-handler.test.ts`
- Modify: `.github/workflows/order-checkout-postgres.yml`

**Interfaces:**
- Consumes: `handleOrderCheckoutRequest()` and the order-checkout state functions.
- Produces: regression coverage for marker ordering, timeout quarantine, definitive 4xx failure, and post-provider persistence quarantine.

- [ ] Add the missing `markOrderCheckoutProviderRequestStarted` mock so claimed-flow tests exercise the real handler sequence.
- [ ] Assert the marker is persisted before `createCheckout` is called.
- [ ] Assert `PAYMENT_PROVIDER_TIMEOUT` returns HTTP 409 with `CHECKOUT_RECONCILIATION_REQUIRED` and never calls `failOrderCheckout`.
- [ ] Assert `PAYMENT_PROVIDER_HTTP_400` calls `failOrderCheckout` and returns a bounded provider-unavailable response.
- [ ] Assert persistence failure after a provider result returns reconciliation-required without failing the order.
- [ ] Include `order-checkout-recovery.postgres.test.ts` in workflow path filters and the PostgreSQL test command.
- [ ] Run the exact-head workflow and confirm the timeout policy test fails against the pre-fix handler.

### Task 3: Restore Prisma migration parity

**Files:**
- Create: `prisma/migrations/20260805_reconcile_z_audit_order_lead_id/migration.sql`

**Interfaces:**
- Consumes: `AuditOrder.leadId` from `prisma/schema.prisma`.
- Produces: nullable `AuditOrder.leadId`, a non-unique index, and an `ON DELETE SET NULL` foreign key.

- [ ] Add the nullable column only when it does not exist.
- [ ] Create `AuditOrder_leadId_idx` with `IF NOT EXISTS`.
- [ ] Add the foreign key only when no matching constraint exists.
- [ ] Do not backfill, delete, or infer lead relationships.
- [ ] Run the full migration chain on ephemeral PostgreSQL and verify Prisma no longer raises `P2022`.

### Task 4: Implement deterministic-versus-ambiguous checkout policy

**Files:**
- Modify: `src/lib/order-checkout-handler.ts`

**Interfaces:**
- Consumes: normalized safe failure codes from provider and persistence operations.
- Produces: `isDefinitiveCheckoutInitializationFailure(code: string): boolean` and fail-closed handler behavior.

- [ ] Classify local validation/configuration errors and provider HTTP 4xx as definitive.
- [ ] Classify timeout, provider HTTP 5xx, network/unknown errors, and persistence errors as ambiguous.
- [ ] For definitive failures, call `failOrderCheckout`, clear the local claim, and return the existing generic provider response.
- [ ] For ambiguous failures, keep the order pending, retain the provider-request marker, and route through the outer reconciliation-required response.
- [ ] Run handler unit tests and PostgreSQL recovery/concurrency suites.

### Task 5: Verify and integrate

**Files:**
- No additional production files.

**Interfaces:**
- Consumes: final PR head.
- Produces: merge only after all exact-head gates are successful.

- [ ] Run `order-checkout-postgres`, migration regressions, `main-gate`, docs automation, roadmap automation, and agent-skills integrity where triggered.
- [ ] Inspect failed job logs and fix only demonstrated root causes.
- [ ] Verify the PR is mergeable and has zero unresolved review threads.
- [ ] Mark the PR ready for review.
- [ ] Merge with `expected_head_sha` and record the merge SHA.
- [ ] Do not execute the new migration outside ephemeral CI.
