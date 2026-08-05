# Distributed Authentication Abuse Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace process-local authentication abuse controls with privacy-safe distributed limits and an explicit trusted-proxy contract.

**Architecture:** A single `authRateLimit` boundary resolves an opaque client identity, derives HMAC-only Redis keys, and consumes client and client/subject windows through the existing distributed backend. Credential routes fail closed when production identity or backend state is unavailable and no longer expose a victim-wide account lock.

**Tech Stack:** Next.js 16, TypeScript 6 strict, Vitest 4, existing Upstash/local Redis adapter.

## Global Constraints

- No production deployment, environment mutation, proxy mutation, service restart, or live credential attempt.
- Do not invent the ingress chain, trusted ranges, Redis image digest, or header overwrite policy.
- No raw email, username, user ID, IP, or forwarding header in Redis keys or auth logs.
- Production must fail closed when trusted identity or distributed backend is unavailable.
- Do not create a subject-only blocking key or externally triggerable account lock.

---

### Task 1: Write RED contract tests

**Files:**
- Replace: `src/lib/authRateLimit.test.ts`
- Create: `src/app/api/auth/login/route.test.ts`
- Create: `src/app/api/auth/signup/route.test.ts`
- Modify: `src/app/api/admin/auth/login/route.test.ts`

- [ ] Prove untrusted forwarding headers fail closed in production.
- [ ] Prove explicit trusted-header configuration produces only HMAC keys.
- [ ] Prove two clients using one victim subject do not share a subject-only key.
- [ ] Prove backend error/disabled states fail closed in production.
- [ ] Prove credential routes stop before database/password/session work when unavailable or limited.
- [ ] Prove successful user login has no process-local account-lock dependency.
- [ ] Commit RED tests and record the exact failing workflow evidence.

### Task 2: Implement the shared boundary

**Files:**
- Replace: `src/lib/authRateLimit.ts`
- Delete: `src/lib/account-lockout.ts`
- Modify: `src/lib/security-log.ts`

- [ ] Add runtime production proxy-contract validation.
- [ ] Derive HMAC client and subject identifiers from `IP_HASH_SALT`.
- [ ] Consume client-only and client/subject fixed windows through `consumeDistributedRateLimit`.
- [ ] Treat production backend `disabled` or `error` as unavailable.
- [ ] Return bounded retry metadata and backend identity without raw values.
- [ ] Add privacy-safe `identifierHash` logging support.

### Task 3: Migrate current callers

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/signup/route.ts`
- Modify: `src/app/api/admin/auth/login/route.ts`
- Modify: `src/app/api/billing/checkout/route.ts`

- [ ] Await the shared limiter before expensive or state-changing work.
- [ ] Return generic 503 when controls are unavailable and 429 with `Retry-After` when limited.
- [ ] Remove account-lock checks, failure recording, and 423 responses.
- [ ] Remove process-local reset behavior.
- [ ] Stop passing raw email to structured authentication logs.

### Task 4: Document the operational contract

**Files:**
- Modify: `.env.example`
- Create: `docs/security/AUTH_ABUSE_TRUST_BOUNDARY.md`

- [ ] Document `AUTH_TRUST_PROXY_HEADERS` and `AUTH_CLIENT_IP_HEADER`.
- [ ] State that ingress must strip/overwrite the selected header and prevent origin bypass.
- [ ] State that real multi-instance Redis and ingress verification remain external evidence gates.

### Task 5: Verify and integrate

- [ ] Run focused auth unit/route tests.
- [ ] Run full `main-gate`, docs, roadmap, and any triggered security workflows on exact head.
- [ ] Verify branch is zero behind `main`, mergeable, and has zero unresolved threads.
- [ ] Merge only with `expected_head_sha`.
- [ ] Update issue #78 with exact evidence and unresolved external inputs.
