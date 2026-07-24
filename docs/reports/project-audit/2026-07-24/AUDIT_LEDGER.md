# Audit Ledger — 2026-07-24

**Branch**: `audit/full-remediation-20260724`
**Base SHA**: `80732ae2035da8a71dcd65465924f32e651b0644`
**Base Branch**: `main`

## Baseline Snapshot

| Check | Before | After |
|---|---|---|
| `pnpm install` | PASS | PASS |
| `pnpm lint` | FAIL (1896 errors) | PASS (0 errors) |
| `pnpm typecheck` | PASS | PASS |
| `pnpm test` | PASS (741/741) | PASS (741/741) |
| `pnpm build` | PASS | PASS |
| `pnpm scan:secrets` | PASS | PASS |
| `pnpm check:actions-pinned` | PASS | PASS |
| `pnpm check:no-database-dumps` | PASS | PASS |
| `pnpm smoke:routes` | PASS (17/17) | PASS (17/17) |
| `pnpm check` | FAIL (exit 1) | PASS (exit 0) |
| Production | UP | UP |

---

## Findings

### F-001: worktrees/ not excluded from ESLint — blocks CI pipeline
- **Severity**: CRITICAL
- **Status**: FIXED
- **Root cause**: `worktrees/` not in ESLint ignores
- **Impact**: `pnpm lint` fails with 1896 errors, blocking `pnpm check` and readiness suite
- **Fix**: Added `worktrees/**` to `eslint.config.mjs` ignores
- **Commit**: pending

### F-002: worktrees/ not in .gitignore
- **Severity**: MEDIUM
- **Status**: FIXED
- **Root cause**: `.gitignore` missing `worktrees/` entry
- **Impact**: 1.1GB untracked directory, lint noise, potential confusion
- **Fix**: Added `worktrees/` to `.gitignore`
- **Commit**: pending

### F-003: Stale git worktrees on detached HEAD
- **Severity**: LOW
- **Status**: NOT_APPLICABLE
- **Evidence**: 2 stale worktrees at `/home/dev13/ASDEV/sites/auditsystems-ri/worktrees/`
- **Impact**: Disk usage only
- **Action**: User decision needed — do not remove without confirmation

### F-004: Silent catch in audit handler notification
- **Severity**: MEDIUM
- **Status**: FIXED
- **File**: `src/worker/audit.handler.ts:179`
- **Fix**: Added error logging to `.catch()` block
- **Commit**: pending

### F-005: Silent catch in signup referral tracking
- **Severity**: MEDIUM
- **Status**: FIXED
- **File**: `src/app/api/auth/signup/route.ts:89`
- **Fix**: Added `logEvent("warn", ...)` to `.catch()` block
- **Commit**: pending

### F-006: Payment preflight fails without .env
- **Severity**: LOW
- **Status**: NOT_APPLICABLE
- **Impact**: Expected without .env — not a code defect

### F-007: Hosting sync DNS mismatch
- **Severity**: LOW
- **Status**: BLOCKED_EXTERNAL
- **Impact**: DNS configuration — requires DNS provider access

### F-008: Email sending is placeholder (console.log only)
- **Severity**: MEDIUM
- **Status**: DOCUMENTED
- **File**: `src/lib/notifications.ts:56-67`
- **Impact**: Audit completion emails are logged but never sent
- **Action**: Requires email provider integration (external decision)

### F-009: Newsletter signup has no backend
- **Severity**: LOW
- **Status**: DOCUMENTED
- **File**: `src/app/api/newsletter/route.ts:17`
- **Impact**: Newsletter signups are logged but not stored
- **Action**: Requires storage integration (external decision)

### F-010: Payment provider TODOs (unverified API contracts)
- **Severity**: MEDIUM
- **Status**: DOCUMENTED
- **File**: `src/lib/payments.ts` (4 locations)
- **Impact**: PayPing and IdPay integrations may not work correctly
- **Action**: Requires API contract verification with providers

### F-011: Explicit `any` in rules.ts and extractResources.ts
- **Severity**: LOW
- **Status**: NOT_APPLICABLE
- **Impact**: All instances have `eslint-disable` comments — intentional for Cheerio DOM callbacks
- **Action**: None — these are third-party callback types without better alternatives

### F-012: Build warning about NFT list tracing
- **Severity**: LOW
- **Status**: DOCUMENTED
- **File**: `src/lib/observability.ts` → `fs.readFile` in `writeToFile()`
- **Impact**: Build warning only, no runtime impact
- **Action**: Could use `turbopackIgnore` comment but not critical

---

## Code Changes Summary

| File | Change | Risk |
|---|---|---|
| `eslint.config.mjs` | Add `worktrees/**` to ignores | None — excludes non-tracked dirs |
| `.gitignore` | Add `worktrees/` | None — prevents future confusion |
| `src/worker/audit.handler.ts` | Log notification errors | None — adds observability |
| `src/app/api/auth/signup/route.ts` | Log referral tracking errors | None — adds observability |

## Quality Gate Results (Post-Fix)

| Command | Status | Evidence |
|---|---|---|
| `pnpm lint` | PASS | 0 errors, 0 warnings |
| `pnpm typecheck` | PASS | Clean compilation |
| `pnpm test` | PASS | 741/741 tests pass |
| `pnpm build` | PASS | Production build succeeds |
| `pnpm scan:secrets` | PASS | No secrets detected |
| `pnpm check` | PASS | Exit code 0 |
| `pnpm smoke:routes` | PASS | 17/17 routes OK |
