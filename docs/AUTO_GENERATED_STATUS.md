# Auto Generated Project Status

Generated at: 2026-07-21T22:01:06.969Z

## Overview
- API routes: 48
- Page routes: 72
- Test files: 74
- NPM scripts: 66

## Roadmap Phases
- Done: 10
- In Progress: 0
- Planned: 0

## API Routes
- `/api/admin/auth/login`
- `/api/admin/auth/logout`
- `/api/admin/auth/sessions`
- `/api/admin/auth/sessions/revoke-all`
- `/api/admin/billing-events`
- `/api/admin/leads`
- `/api/admin/leads/[id]`
- `/api/admin/leads/[id]/retry-audit`
- `/api/admin/leads/[id]/start-audit`
- `/api/admin/leads/[id]/status`
- `/api/admin/monitoring`
- `/api/admin/stats`
- `/api/analytics/rum`
- `/api/audit/runs`
- `/api/audit/runs/[id]`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/resend-verification`
- `/api/auth/sessions`
- `/api/auth/signup`
- `/api/auth/verify-email`
- `/api/billing/callback`
- `/api/billing/checkout`
- `/api/billing/current`
- `/api/csrf`
- `/api/health`
- `/api/leads`
- `/api/live`
- `/api/metrics`
- `/api/newsletter`
- `/api/notifications/history`
- `/api/notifications/preferences`
- `/api/notifications/unsubscribe`
- `/api/orders`
- `/api/payments/callback`
- `/api/pdf/[token]`
- `/api/projects`
- `/api/projects/[projectId]/audit`
- `/api/projects/[projectId]/schedule`
- `/api/ready`
- `/api/referrals`
- `/api/reports/[token]`
- `/api/reports/[token]/capture`
- `/api/reports/[token]/unlock`
- `/api/settings/brand`
- `/api/stats`
- `/api/team`

## Page Routes
- `/`
- `/admin`
- `/admin/leads`
- `/admin/login`
- `/admin/monitoring`
- `/app`
- `/app/billing`
- `/app/notifications`
- `/app/projects`
- `/app/projects/[projectId]`
- `/app/projects/[projectId]/audits/[runId]`
- `/app/projects/[projectId]/schedule`
- `/app/projects/new`
- `/app/referrals`
- `/app/reports`
- `/app/settings`
- `/app/settings/brand`
- `/app/team`
- `/asdev`
- `/audit`
- `/audit-readiness`
- `/audit/r/[token]`
- `/audit/r/[token]/success`
- `/audit/r/[token]/unlock`
- `/blog`
- `/blog/[slug]`
- `/brand/asdev-portfolio`
- `/case-studies`
- `/case-studies/[slug]`
- `/compare/[tokenA]/[tokenB]`
- `/en`
- `/en/audit`
- `/en/audit/r/[token]`
- `/en/audit/r/[token]/success`
- `/en/audit/r/[token]/unlock`
- `/en/blog`
- `/en/blog/[slug]`
- `/en/brand/asdev-portfolio`
- `/en/case-studies`
- `/en/case-studies/[slug]`
- `/en/failed`
- `/en/faq`
- `/en/guides`
- `/en/guides/[slug]`
- `/en/landing/agency`
- `/en/landing/ecommerce-audit`
- `/en/landing/security-audit`
- `/en/landing/speed-optimization`
- `/en/pillar/iran-readiness-audit`
- `/en/pricing`
- `/en/qualification`
- `/en/sample-report`
- `/en/standards`
- `/failed`
- `/faq`
- `/guides`
- `/guides/[slug]`
- `/landing/agency`
- `/landing/ecommerce-audit`
- `/landing/security-audit`
- `/landing/security-check`
- `/landing/seo-audit`
- `/landing/speed-optimization`
- `/landing/wordpress-audit`
- `/login`
- `/pillar/iran-readiness-audit`
- `/pricing`
- `/qualification`
- `/sample-report`
- `/signup`
- `/standards`
- `/verify-email`

## Environment Variables (.env.example)
- `DATABASE_URL`
- `IP_HASH_SALT`
- `CSRF_SECRET`
- `SESSION_SECRET`
- `DOWNLOAD_TOKEN_SECRET`
- `ADMIN_SESSION_SECRET`
- `AUDIT_DNS_GUARD`
- `AUDIT_DNS_FAIL_OPEN`
- `WORKER_POLL_MS`
- `WORKER_JOB_TIMEOUT_MS`
- `WORKER_CONCURRENCY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `REDIS_URL`
- `REQUIRE_DISTRIBUTED_RATE_LIMIT`
- `PAYMENT_PROVIDER_DEFAULT`
- `APP_BASE_URL_STRICT`
- `NEXT_PUBLIC_SITE_URL`
- `ZARINPAL_MERCHANT_ID`
- `PAYPING_API_KEY`
- `IDPAY_API_KEY`
- `IDPAY_SANDBOX`
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## Phase Checks Inventory
| Phase | Title | Status | Checks |
|---|---|---|---:|
| A | Foundation | done | 2 |
| B | Scanner MVP | done | 2 |
| C | Report UX + Summary JSON | done | 2 |
| D | Lead/Order Gating | done | 2 |
| E | Security and Ops Hardening | done | 4 |
| F | Monetization and Delivery | done | 3 |
| G | SEO Scale | done | 2 |
| H | Excellence / Momtaz | done | 3 |
| I | SEO Execution Automation | done | 2 |
| J | Shared VPS Production Rollout | done | 3 |

## Key Commands
- `pnpm run dev` -> `next dev`
- `pnpm run check` -> `pnpm run check:no-database-dumps && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build`
- `pnpm run worker:dev` -> `tsx src/worker/index.ts`
- `pnpm run roadmap:run` -> `tsx src/scripts/roadmap-automation.ts --strict`
- `pnpm run roadmap:dry` -> `tsx src/scripts/roadmap-automation.ts --dry-run`
- `pnpm run roadmap:phase` -> `tsx src/scripts/roadmap-automation.ts --phase`
- `pnpm run seo:audit` -> `tsx src/scripts/seo-audit-automation.ts --strict`
- `pnpm run seo:audit:dry` -> `tsx src/scripts/seo-audit-automation.ts --dry-run`
- `pnpm run docs:generate` -> `tsx src/scripts/docs-automation.ts`
- `pnpm run docs:refresh` -> `pnpm run docs:generate && pnpm run roadmap:run`
- `pnpm run payment:preflight` -> `tsx src/scripts/payment-preflight.ts`
- `pnpm run payment:preflight:strict` -> `tsx src/scripts/payment-preflight.ts --strict`
- `pnpm run payment:zarinpal:smoke` -> `tsx src/scripts/zarinpal-smoke.ts`
- `pnpm run automation:run` -> `tsx src/scripts/automation-master.ts --strict`
- `pnpm run lighthouse:local` -> `tsx src/scripts/lighthouse-local.ts`
