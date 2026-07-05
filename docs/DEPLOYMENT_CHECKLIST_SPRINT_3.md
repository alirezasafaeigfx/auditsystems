# Deployment Checklist — Sprint 3

**Date**: 2026-07-05
**Status**: Ready for production deploy
**Main branch**: `64daf24`

---

## Pre-Deploy Checklist

- [x] All tests passing (379/379)
- [x] Lint clean (0 errors, 0 warnings)
- [x] Typecheck clean
- [x] Build succeeds
- [x] Database migration SQL ready
- [x] Plan seed script ready
- [x] Cron setup script ready
- [x] PM2 ecosystem config ready
- [x] Rollback docs at `docs/BACKUP_AND_ROLLBACK_SPRINT_3.md`

## Deploy Steps

### 1. Database Backup
```bash
pg_dump "$DATABASE_URL" --format=custom --file="backups/pre-sprint3-$(date +%Y%m%d).dump"
```

### 2. Deploy Code
```bash
cd /home/dev13/my-project/sites/live/auditsystems
git pull origin main
bash scripts/deploy-production.sh
```

### 3. Run Migration
```bash
npx prisma migrate deploy
```

### 4. Seed Plans
```bash
pnpm run plans:seed
```

### 5. Setup Cron Jobs
```bash
bash scripts/setup-cron.sh
```

### 6. Start Services
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 7. Verify
```bash
curl http://localhost:3000/api/ready
bash scripts/smoke-public-routes.sh
```

## Post-Deploy Verification

- [ ] `/api/ready` returns 200
- [ ] `/app` redirects to `/login` (unauthenticated)
- [ ] `/login` loads and accepts credentials
- [ ] `/signup` creates account and redirects to `/app`
- [ ] `/app/billing` shows Free plan
- [ ] `/pricing` shows 4-tier subscription
- [ ] MOCK checkout activates subscription
- [ ] Scheduled audit creation works (Pro plan)
- [ ] Email verification token generation works
- [ ] Worker processes audit jobs

## Rollback

If issues occur:
```bash
# Restore database
pg_restore "$DATABASE_URL" --clean --if-exists backups/pre-sprint3-YYYYMMDD.dump

# Revert code
git checkout <pre-sprint3-commit> -- .
pnpm run build
pm2 restart ecosystem.config.cjs
```

## New Scripts Added

| Script | Command | Purpose |
|--------|---------|---------|
| Seed plans | `pnpm run plans:seed` | Create/update 4 plan tiers |
| Scheduled audits | `pnpm run scheduled:run` | Run due scheduled audits |
| Auth cleanup | `pnpm run auth:cleanup` | Clean expired sessions/tokens |
| Subscription expiry | `pnpm run subscriptions:expire` | Expire past-due subscriptions |
| Deploy | `pnpm run deploy:production` | Full production deployment |
| Cron setup | `bash scripts/setup-cron.sh` | Install cron jobs |
| PM2 | `pm2 start ecosystem.config.cjs` | Start web + worker |

## New API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/billing/checkout` | POST | Yes | Start subscription checkout |
| `/api/billing/callback` | GET/POST | No | Payment callback |
| `/api/billing/current` | GET | Yes | Current subscription status |
| `/api/projects/[id]/schedule` | GET/POST | Yes | Manage scheduled audits |
| `/api/auth/verify-email` | GET | No | Verify email token |
| `/api/auth/resend-verification` | POST | Yes | Resend verification email |

## New Pages

| Page | Purpose |
|------|---------|
| `/verify-email` | Email verification page |
| `/app/billing` | Subscription management |

## New Components

| Component | Purpose |
|-----------|---------|
| `CheckoutButton` | Client-side checkout with CSRF |
| `ScheduleManager` | Manage scheduled audits per project |

## New Libs

| Module | Purpose |
|--------|---------|
| `src/lib/subscription.ts` | Subscription CRUD, usage ledger, invoices |
| `src/lib/billing-auth.ts` | Auth helper for billing routes |
| `src/lib/emailVerification.ts` | Token generation, verification, cleanup |

## New Scripts

| Script | Purpose |
|--------|---------|
| `src/scripts/seed-plans.ts` | Seed plan tiers |
| `src/scripts/run-scheduled-audits.ts` | Execute due scheduled audits |
| `src/scripts/cleanup-auth.ts` | Clean expired sessions/tokens |
| `src/scripts/expire-subscriptions.ts` | Expire past-due subscriptions |
| `src/scripts/deploy-production.sh` | Full deployment automation |
