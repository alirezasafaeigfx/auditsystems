# Audit Ledger — 2026-07-24

**Branch**: `audit/full-remediation-20260724`
**Base SHA**: `80732ae2035da8a71dcd65465924f32e651b0644`
**Final SHA**: `5c758fa`
**PR**: #75

## Baseline Snapshot

| Check | Before | After |
|---|---|---|
| `pnpm install` | PASS | PASS |
| `pnpm lint` | FAIL (1896 errors) | PASS (0 errors) |
| `pnpm typecheck` | PASS | PASS |
| `pnpm test` | PASS (741/741) | PASS (745/745) |
| `pnpm build` | PASS | PASS |
| `pnpm scan:secrets` | PASS | PASS |
| `pnpm check:actions-pinned` | PASS | PASS |
| `pnpm check:no-database-dumps` | PASS | PASS |
| `pnpm smoke:routes` | PASS (17/17) | PASS (17/17) |
| `pnpm check` | FAIL (exit 1) | PASS (exit 0) |
| Production | UP | UP |

---

## Findings & Fixes

### F-001: worktrees/ not excluded from ESLint — blocks CI pipeline
- **Severity**: CRITICAL
- **Status**: FIXED
- **Fix**: Added `worktrees/**` to `eslint.config.mjs` ignores
- **Commit**: `646d968`

### F-002: worktrees/ not in .gitignore
- **Severity**: MEDIUM
- **Status**: FIXED
- **Fix**: Added `worktrees/` to `.gitignore`
- **Commit**: `646d968`

### F-003: Silent catch in audit handler notification
- **Severity**: MEDIUM
- **Status**: FIXED
- **File**: `src/worker/audit.handler.ts:179`
- **Commit**: `646d968`

### F-004: Silent catch in signup referral tracking
- **Severity**: MEDIUM
- **Status**: FIXED
- **File**: `src/app/api/auth/signup/route.ts:89`
- **Commit**: `646d968`

### F-005: CRITICAL — MOCK provider bypass in production
- **Severity**: CRITICAL
- **Status**: FIXED
- **Root cause**: `resolvePaymentProvider()` and `asProvider()` silently returned MOCK for unknown providers, allowing attackers to bypass real payment verification
- **Fix**: Throw error in production when MOCK is selected from external input
- **Files**: `src/lib/payments.ts`, `src/app/api/billing/callback/route.ts`, `src/app/api/payments/callback/route.ts`
- **Commit**: `c5c75e4`

### F-006: HIGH — No amount validation on createCheckout
- **Severity**: HIGH
- **Status**: FIXED
- **Fix**: Added bounds checking for amountToman (0 < amount <= 100M), orderId (<=64 chars), callbackRef (<=128 chars)
- **File**: `src/lib/payments.ts`
- **Commit**: `c5c75e4`

### F-007: HIGH — Race condition on payment status updates
- **Severity**: HIGH
- **Status**: FIXED
- **Fix**: Changed `where: { id }` to `where: { id, status: "PENDING" }` for atomic conditional update
- **Files**: `src/app/api/payments/callback/route.ts`
- **Commit**: `c5c75e4`

### F-008: HIGH — Provider mismatch not validated in callbacks
- **Severity**: HIGH
- **Status**: FIXED
- **Fix**: Added provider validation against stored order/invoice provider
- **Files**: `src/app/api/billing/callback/route.ts`, `src/app/api/payments/callback/route.ts`
- **Commit**: `c5c75e4`

### F-009: MEDIUM — Newsletter signup has no backend
- **Severity**: MEDIUM
- **Status**: FIXED
- **Fix**: Added NewsletterSubscriber model, database storage, dedup, resubscribe support
- **Files**: `prisma/schema.prisma`, `src/app/api/newsletter/route.ts`
- **Commit**: `5c758fa`

### F-010: Payment provider TODOs (unverified API contracts)
- **Severity**: MEDIUM
- **Status**: DOCUMENTED
- **File**: `src/lib/payments.ts` (4 locations)
- **Action**: Requires API contract verification with PayPing and IdPay

### F-011: Explicit `any` in rules.ts and extractResources.ts
- **Severity**: LOW
- **Status**: NOT_APPLICABLE
- **Impact**: Intentional for Cheerio DOM callbacks

### F-012: Build warning about NFT list tracing
- **Severity**: LOW
- **Status**: DOCUMENTED
- **File**: `src/lib/observability.ts` → `fs.readFile`
- **Action**: Could use `turbopackIgnore` but not critical

### F-013: Hosting sync DNS mismatch
- **Severity**: LOW
- **Status**: BLOCKED_EXTERNAL
- **Action**: Requires DNS provider access

### F-014: Admin auth plaintext password comparison
- **Severity**: MEDIUM
- **Status**: DOCUMENTED
- **File**: `src/lib/admin-auth.ts`
- **Action**: Consider bcrypt hashing for production

### F-015: In-memory rate limiter resets on restart
- **Severity**: MEDIUM
- **Status**: DOCUMENTED
- **File**: `src/lib/authRateLimit.ts`
- **Action**: Consider Redis-backed rate limiting

---

## Quality Gate Results (Final)

| Command | Status | Evidence |
|---|---|---|
| `pnpm lint` | PASS | 0 errors, 0 warnings |
| `pnpm typecheck` | PASS | Clean compilation |
| `pnpm test` | PASS | 745/745 tests pass |
| `pnpm build` | PASS | Production build succeeds |
| `pnpm scan:secrets` | PASS | No secrets detected |
| `pnpm check` | PASS | Exit code 0 |
| `pnpm smoke:routes` | PASS | 17/17 routes OK |

## Commits

1. `646d968` — fix(ci): exclude worktrees from ESLint, add gitignore, log silent catches
2. `c5c75e4` — fix(security): block MOCK provider in production, validate payment inputs, fix race conditions
3. `5c758fa` — feat(newsletter): store signups in database with dedup and resubscribe
