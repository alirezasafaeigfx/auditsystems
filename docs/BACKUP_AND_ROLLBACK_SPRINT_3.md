# Backup & Rollback — Sprint 3

**Date**: 2026-07-05
**Sprint**: 3 — Revenue + Retention Engine

## Backup Status

- **Deployed commit**: `3bd46d7d1225c29af35db18cfa03be25007dc20e`
- **Branch**: `feature/sprint-3-revenue-retention-engine`
- **DB backup**: Skipped (DATABASE_URL not set locally). Production backup required before deploy.
- **PM2 snapshot**: PM2 not available locally.
- **Env checksum**: Recorded in backup directory.
- **Backup directory**: `~/backups/auditsystems/20260705-031509/`

## Pre-Sprint State

- SaaS foundation MVP merged (PR #4)
- Dashboard v2, billing prep, audit detail merged (PR #6)
- Auth hardening merged (PR #8)
- Dev experience and tests merged (PR #9, #10)
- Production routes healthy
- SESSION_SECRET and CSRF_SECRET configured
- 34 test files, ~58 tests passing

## Rollback Instructions

### Database Rollback

All Sprint 3 migrations are **additive only** (new tables and columns). No destructive changes.

To rollback Sprint 3 schema:
```bash
# Find the migration name
ls prisma/migrations/

# Rollback to the pre-sprint migration
npx prisma migrate resolve --rolled-back <sprint-3-migration-name>
```

Or simply drop new tables:
```sql
DROP TABLE IF EXISTS "EmailVerificationToken";
DROP TABLE IF EXISTS "ScheduledAudit";
DROP TABLE IF EXISTS "Invoice";
DROP TABLE IF EXISTS "UsageLedger";
DROP TABLE IF EXISTS "Subscription";
DROP TABLE IF EXISTS "Plan";
```

### Code Rollback

```bash
git checkout main
git branch -D feature/sprint-3-revenue-retention-engine
```

### Production Pre-Deploy Checklist

- [ ] Database backup completed
- [ ] PM2 snapshot saved
- [ ] Env checksum verified
- [ ] Migration tested on staging
- [ ] Smoke tests pass
- [ ] Owner approval obtained

## What Sprint 3 Adds (Non-Destructive)

- 6 new Prisma models (Plan, Subscription, UsageLedger, Invoice, ScheduledAudit, EmailVerificationToken)
- Plan seed script
- Subscription billing API routes
- Billing page v2
- Scheduled audit route + script
- Email verification foundation
- Enhanced auth cleanup
- Retention dashboard widgets
- Updated smoke docs and tests
