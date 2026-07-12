# Release Integrity Remediation Report

**Date**: 2026-07-11
**Branch**: `codex/release-integrity-remediation`
**Base SHA**: `e933767` (origin/main)
**Status**: COMPLETE

---

## Workstream Summary

### Agent A — CI Reproducibility ✅

| File | Change |
|------|--------|
| `.gitignore` | Removed `pnpm-lock.yaml` from gitignore |
| `package.json` | Added `"packageManager": "pnpm@9.15.0"` |
| `pnpm-lock.yaml` | Now tracked by git |
| `scripts/scan-secrets.sh` | Added grep fallback when `rg` unavailable; excluded CI fixtures |
| `.github/workflows/main-gate.yml` | Removed `sudo apt-get install ripgrep`; pinned actions to SHA |
| `.github/workflows/production-readiness.yml` | Removed `sudo apt-get install ripgrep`; pinned actions to SHA |

### Agent B — Prisma Migration Integrity ✅

| File | Change |
|------|--------|
| `prisma/migrations/20260711000000_lead_lifecycle_upgrade/migration.sql` | Forward-only migration: enum upgrade (CALL→QUALIFIED, PROPOSAL→DELIVERED, WON→CONVERTED), convertedAt from wonAt, remove unique on leadId |
| `prisma/schema.prisma` | `order AuditOrder?` → `orders AuditOrder[]`; removed `@unique` from `AuditOrder.leadId` |

**Migration Mapping**:
```
NEW       → NEW
QUALIFIED → QUALIFIED
CALL      → QUALIFIED
PROPOSAL  → DELIVERED
WON       → CONVERTED
LOST      → LOST
```

**reportStatus Backfill**: Not needed — `reportStatus` defaults to `QUEUED` and is updated by the audit handler.

### Agent C — Admin Security and Lead State Machine ✅

| File | Change |
|------|--------|
| `src/lib/lead-state-machine.ts` | New: shared state machine with `VALID_TRANSITIONS`, `canTransition()`, `validateTransition()`, `isTerminalStatus()` |
| `src/app/api/admin/leads/[id]/status/route.ts` | Added CSRF protection, transition validation, lostReason requirement |
| `src/components/admin/AdminLeads.tsx` | Added CSRF headers, error display, safe hostname rendering, `orders[0]` for one-to-many |

### Agent D — Audit Handler and Funnel Integrity ✅

| File | Change |
|------|--------|
| `src/worker/audit.handler.ts` | Wrapped `recordFunnelEvent()` in try/catch — audit stays SUCCEEDED/REVIEW on analytics failure |
| `src/app/api/reports/[token]/capture/route.ts` | Added `REPORT_NOT_READY` guard (409) if audit not succeeded |
| `src/app/api/orders/route.ts` | Prevents terminal lead (CONVERTED/LOST) downgrade to REPORT_READY |

### Agent E — English Qualification Route ✅

| File | Change |
|------|--------|
| `src/app/en/qualification/page.tsx` | New: English qualification page with shared QualificationForm |
| `scripts/smoke-public-routes.sh` | Added `/qualification`, `/en/qualification`, `/asdev` route checks |

### Additional Fixes

| File | Change |
|------|--------|
| `src/app/api/admin/leads/route.ts` | Fixed `as any` casts using `Prisma.AuditLeadWhereInput`; updated `order` → `orders` include |
| `src/app/api/reports/[token]/capture/route.test.ts` | Added `status: "SUCCEEDED"` to mock for new REPORT_NOT_READY guard |

---

## Validation Results

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | ✅ PASS |
| `pnpm prisma format` | ✅ PASS |
| `pnpm prisma validate` | ✅ PASS |
| `pnpm lint` | ✅ PASS (0 errors) |
| `pnpm typecheck` | ✅ PASS |
| `pnpm test` | ✅ PASS (61 files, 637 tests) |
| `pnpm build` | ✅ PASS |
| `pnpm scan:secrets` | ✅ PASS |
| `git diff --check` | ✅ PASS |

---

## Files Changed (14 total)

```
 .github/workflows/main-gate.yml                   |  11 +--
 .github/workflows/production-readiness.yml        |   9 +-
 .gitignore                                        |   1 -
 package.json                                      |   1 +
 prisma/schema.prisma                              | 102 +++++++++++-----------
 scripts/scan-secrets.sh                           |  67 +++++++++-----
 scripts/smoke-public-routes.sh                    |   3 +
 src/app/api/admin/leads/[id]/status/route.ts      |  24 ++++-
 src/app/api/admin/leads/route.ts                  |  21 ++---
 src/app/api/orders/route.ts                       |  12 +--
 src/app/api/reports/[token]/capture/route.test.ts |   2 +-
 src/app/api/reports/[token]/capture/route.ts      |   4 +
 src/components/admin/AdminLeads.tsx               |  27 +++---
 src/worker/audit.handler.ts                       |  10 ++-
```

Plus 3 new files:
- `prisma/migrations/20260711000000_lead_lifecycle_upgrade/migration.sql`
- `src/lib/lead-state-machine.ts`
- `src/app/en/qualification/page.tsx`

---

## Production Actions Performed

**none**
