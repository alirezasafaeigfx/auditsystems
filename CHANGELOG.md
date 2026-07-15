# Changelog

## v0.6.0 - 2026-07-15
### Release #103 — Security and Production Hardening

#### Security
- Replaced unsubscribe tokens with HMAC-SHA-256 signatures and domain separation.
- Added 21 unsubscribe-token regression tests; legacy token links are intentionally invalid.
- Enforced fail-closed production rate limiting.
- Moved report passwords from URL parameters to POST request bodies.
- Added CSRF enforcement to brand/settings mutations.
- Verified existing authentication and CSRF controls for protected status endpoints.
- Documented the Release #103-only acceptance of stateless admin sessions with a 24-hour maximum lifetime and emergency revoke-all by rotating `ADMIN_SESSION_SECRET`.

#### Release and Data Safety
- Added database-name normalization and release-safety coverage to `scripts/backup-db.sh` and `scripts/restore-db.sh`; remote URL target propagation remains tracked in Issue #55.
- Rehearsed clean and idempotent PostgreSQL 16 migrations.
- Verified backup integrity, disposable restore, key table/migration counts, connectivity, and source database immutability.
- Removed the tracked rehearsal database dump and added a CI guard.
- Recorded per-file database-dump enforcement as required follow-up in Issue #52.
- Recorded individual admin-session revocation as required follow-up in Issue #53.

#### Verification and Deployment
- 686/686 tests passed with lint, typecheck, build, secret scan, and release gates green.
- Deployed source SHA `d55312543ef74b003aeac6aa560980e78b876e57`.
- Activated immutable release `20260715T204648Z-d5531254` on 2026-07-15.
- Verified public readiness and health with database and Redis passing.
- No visual redesign was included; this release changes security and operational behavior.

## v0.5.0 - 2026-07-07
### Roadmap Execution — Phases 2-6 Complete

#### Phase 2: Audit Engine Trust and Accuracy
- Created `src/lib/finding-registry.ts` — single source of truth for all 31 finding codes with metadata, severity, recommendations, business impact
- Created `src/lib/scoring.ts` — scoring system (0-100 overall + category scores + grade levels)
- Created `src/fixtures/audit/index.ts` — 6 test fixtures (good, average, bad, WordPress, ecommerce, Persian)
- Created `src/lib/__tests__/rules.regression.test.ts` — 115 regression tests for all 31 finding codes
- Integrated scoring into `src/worker/audit.handler.ts` — scores calculated on audit completion

#### Phase 3: Report UX and Conversion
- Added executive summary to report page with score, grade, category scores, critical issues
- Created `src/lib/action-plan.ts` — effort/impact matrix with 4 quadrants (Quick Wins, Major Projects, Fill-ins, Thankless)
- Added action plan section to report page
- Created `src/components/EmailCapture.tsx` — email capture form for lead generation
- Created `src/app/api/reports/[token]/capture/route.ts` — email capture API endpoint
- Created `src/app/app/reports/page.tsx` — report history page with pagination

#### Phase 4: SaaS Foundation Hardening
- Created error pages: 404 (`not-found.tsx`), 500 (`error.tsx`), 403 (`forbidden.tsx`), 429 (`rate-limited.tsx`)
- Enhanced dashboard with usage stats widgets, quick actions, score display, color-coded progress bars
- Added social proof section to homepage: audit count, trust signals, how-it-works visual

#### Phase 5: Billing and Subscription
- Added `upgradeSubscription`, `downgradeSubscription`, `reactivateSubscription` to subscription.ts
- Created `src/lib/__tests__/payment-flow.test.ts` — 10 end-to-end payment smoke tests

#### Phase 6: Scheduled Audits and Retention
- Created `src/components/ScheduleManager.tsx` — schedule UI component with frequency toggle
- Created `src/app/app/projects/[projectId]/schedule/page.tsx` — schedule page

#### Automation and Performance
- Created `scripts/automation-master.sh` — master orchestrator (quality, deploy, monitor, report, sync)
- Created `scripts/monitor-platform.sh` — platform health monitor (3 sites + SSL + VPS)
- Created `scripts/setup-hermes-cron.sh` — Hermes cron job activation
- Created `scripts/daily-summary.sh` — daily status report
- Created `scripts/cpu-governor.sh` — CPU governor manager
- Enhanced `scripts/gpu-run.sh` — V8 flags, memory tuning, process priority
- Enhanced `scripts/gpu-browser-run.sh` — browser GPU acceleration
- Added `auto:*` and `perf:*` npm scripts to package.json

### Testing
- 48 test files, 567 tests (was 396, added 171 new tests)
- All tests pass, lint clean, typecheck clean

## v0.4.0 - 2026-07-02
### Growth Roadmap Execution
- Added SocialProofCounter component with live audit count from database
- Added /api/stats endpoint for audit statistics
- Added trust signals section to homepage (SSL, speed, reports, privacy)
- Created /pricing page with three tiers (Free/Full/Consultation) - FA/EN
- Added comparison table for pricing features
- Added 4 new guides: security checklist, WordPress speed, e-commerce SEO, mobile performance
- Created /landing/ecommerce-audit page - FA/EN
- Created /landing/security-audit page - FA/EN
- Created /landing/speed-optimization page - FA/EN
- Added NewsletterSignup component with form and /api/newsletter endpoint
- Added Testimonials component with 3 customer reviews
- Added newsletter section to homepage

### Fixes
- Fixed deploy script to use standalone server.js instead of next start (Next.js 16)
- Fixed SEO audit sitemap count (SEO-C06) to match actual 7 static routes
- Removed localhost fallback in src/lib/site.ts, now uses production URL
- Migrated middleware.ts to proxy.ts for Next.js 16 compatibility (zero warnings)

### Testing
- Added unit tests for csrf, seoMeta, summary, token, brand, observability, metrics (47 new tests)

## v0.3.0 - 2026-07-02
- Fixed SEO audit sitemap count (SEO-C06) to match actual 7 static routes.
- Removed localhost fallback in `src/lib/site.ts`, now uses production URL.
- Added HeroAuditForm component for inline audit form on homepage (FA/EN).
- Enhanced sample report pages with 6 detailed findings (CRITICAL/HIGH/MEDIUM severity).
- Added URL prefill support (`?url=`) on audit pages.
- Migrated `middleware.ts` to `proxy.ts` for Next.js 16 compatibility (zero warnings).
- Fixed ripgrep config error in roadmap automation.

## v0.2.0 - 2026-02-21
- UI/UX shell redesign with production-grade header/footer and typography.
- Added cross-project Persian font assets and cohesive visual system.
- Completed roadmap phases A-G with strict automation checks.
- Added production-readiness preflight, zarinpal smoke test, and master automation.
- Added operational configs for systemd/pm2 and monitoring alert rules.
- Added release and rollback runbooks.
