# Roadmap (Phased)

Automation runner:
- `pnpm run roadmap:run`
- `docs/ROADMAP_AUTOMATION.md`

## Phase A — Foundation
Status: Done
- [x] Next.js App Router setup
- [x] Prisma schema + initial migration
- [x] Core API routes for run/status/report
- [x] Docker compose for local Postgres

## Phase B — Scanner MVP
Status: Done
- [x] Worker loop with lease/retry/backoff
- [x] URL normalization + SSRF guard + tests
- [x] HTML resource extraction
- [x] Findings v1 rules engine

## Phase C — Report UX + Summary JSON
Status: Done
- [x] `asdev.audit.summary.v1` builder
- [x] Persisted summary + findings
- [x] Public report page by token
- [x] Sample summary fixture for UI

## Phase D — Lead/Order Gating
Status: Done
- [x] Unlock flow with email capture
- [x] Order API endpoint (`/api/orders`)
- [x] Reuse existing pending/paid order
- [x] Block checkout when report is not ready

## Phase E — Security and Ops Hardening
Status: Done
- [x] Distributed-capable rate limit backend (Upstash Redis + fallback)
- [x] DNS rebinding guard in URL normalization
- [x] Error sanitization + no-store on sensitive APIs
- [x] request-id + structured API logs
- [x] Prometheus-style metrics endpoint (`/api/metrics`)

## Phase F — Monetization and Delivery
Status: Done
- [x] Payment callback route (`/api/payments/callback`)
- [x] Real provider integration layer (Zarinpal + provider abstraction)
- [x] Paid PDF/report delivery endpoint (`/api/pdf/[token]`)
- [x] Signed download token validation

## Phase G — SEO Scale
Status: Done
- [x] Programmatic guides index and dynamic guide pages
- [x] Pillar page for audit positioning
- [x] Sitemap and robots routes
- [x] Canonical/open graph metadata for guide pages

## Phase H — Excellence / Momtaz
Status: Done
- [x] Bilingual product routes (`/` + `/en/*`) for core flow and report flow
- [x] Locale-aware shell (`lang/dir/navigation/footer`) in unified layout
- [x] Multi-language SEO coverage (hreflang alternates + bilingual sitemap)
- [x] Edge security headers and liveness/readiness API model
- [x] Migrated `middleware.ts` to `proxy.ts` for Next.js 16 compatibility

## Phase I — SEO Execution Automation
Status: Done
- [x] Base URL governance helper (`src/lib/site.ts`) and metadata utilities (`src/lib/seoMeta.ts`)
- [x] Full metadata coverage for indexable templates (audit/sample/pillar/guides/home)
- [x] Noindex policy for tokenized report routes and failed pages
- [x] Localized guide content split (`fa/en`) + guide breadcrumbs/related links + article schema
- [x] Real sitemap freshness model (`updatedAt`) and stricter robots disallow rules
- [x] Automated SEO checks (`pnpm run seo:audit`) with artifacts in `logs/seo/`
- [x] Fixed SEO-C06 sitemap count mismatch (12→14 static entries)
- [x] Removed localhost fallback from `src/lib/site.ts` (SEO-C04)

## Phase J — Shared VPS Production Rollout
Status: Done
- [x] Roll out as independent app on shared VPS under brand subdomain: `audit.alirezasafaeisystems.ir`
- [x] Keep isolation by app/runtime (dedicated PM2 app names + dedicated env files + dedicated release directory)
- [x] Use existing deploy pattern (`ops/deploy/deploy.sh`) with production/staging ports (`3010`/`3011`)
- [x] Provision Nginx site + TLS cert for production/staging audit domains
- [x] Apply server hardening baseline: increase swap to `2G`, verify journald/log growth, keep release retention active
- [x] Complete production env + data readiness: `DATABASE_URL`, payment provider, redis rate-limit config, strict base URL
- [x] Execute go-live quality gates on target host:
  - [x] `pnpm run roadmap:run`
  - [x] `pnpm run seo:audit`
  - [x] readiness checks on public domain (`production/staging`)
- [x] Connect internal links from main brand site (`/fa` and `/en`) to audit product routes

## Execution Backlog (No Timeline)

### Phase 1 — Stabilize & Clarify
Status: Done (2026-02-24)
- [x] یکسان‌سازی health probe policy روی `GET /api/ready` برای همه مانیتورینگ‌ها (حذف false-negative ناشی از `HEAD`)
- [x] مرور نهایی copy فارسی صفحه اصلی برند و `/fa/standards` با معیار «این سایت چیست/برای چه کسی است/خروجی چیست»
- [x] بررسی regression زبان پیش‌فرض فارسی در هر سه دامنه بعد از هر deploy

### Phase 2 — Systemize Shared UX
Status: Done (2026-02-24)
- [x] استخراج الگوی مشترک `ASDEV` (footer signature + profile block + cross-link) برای سه پروژه
- [x] تعریف قرارداد component-level برای shared sections بدون شکستن معماری فعلی هر repo
- [x] کاهش تکرار microcopy در CTA/empty/error state بین `portfolio`, `persiantoolbox`, `audit`

### Phase 3 — Optimize Growth & SEO
Status: Done (2026-02-24)
- [x] بهینه‌سازی CWV با تمرکز روی LCP صفحات کلیدی (`/fa`, `/fa/standards`, `/audit`)
- [x] تکمیل measurement واقعی (GA4/GSC + conversion events) و ثبت baseline KPI
- [x] ارتقای محتوای استانداردها با intent map فارسی و internal-link plan بین سه محصول

### Phase 4 — UX Polish & Conversion
Status: Done (2026-07-02)
- [x] HeroAuditForm component for inline audit form on homepage (FA/EN)
- [x] Enhanced sample report pages with detailed findings (CRITICAL/HIGH/MEDIUM severity)
- [x] URL prefill support (`?url=`) on audit pages for seamless flow from homepage
- [x] Migrated `middleware.ts` to `proxy.ts` for Next.js 16 compatibility
- [x] Fixed SEO audit sitemap count (SEO-C06) and localhost fallback (SEO-C04)

### Phase 5 — Growth & Marketing
Status: Done (2026-07-02)
- [x] Social proof counter (SocialProofCounter + /api/stats)
- [x] Trust signals section on homepage
- [x] Pricing page with three tiers (FA/EN)
- [x] Comparison table for pricing features
- [x] 4 new guides: security, WordPress speed, e-commerce SEO, mobile performance
- [x] 3 landing pages: ecommerce, security, speed (FA/EN)
- [x] Newsletter signup (NewsletterSignup + /api/newsletter)
- [x] Testimonials component
- [x] Deploy script fix for Next.js 16 standalone mode

## Sprint 1 — SaaS Foundation MVP
Status: Done (2026-07-04) | PR #4 merged

- [x] User/Organization/Membership/Session/Project Prisma models
- [x] Extend AuditRun with optional projectId/organizationId
- [x] Auth helpers: password hashing (scrypt), session management
- [x] API routes: /api/auth/{signup,login,logout,me}
- [x] Project CRUD: /api/projects + /api/projects/[id]/audit
- [x] Dashboard shell: /app layout, projects, project detail
- [x] Login/signup pages
- [x] Free plan usage limits (1 project, 3 audits/month)
- [x] CSRF token delivery endpoint and client wiring
- [x] Logout CSRF protection
- [x] 210 tests passing

## Sprint 2 — Dashboard & Billing Prep
Status: Done (2026-07-04) | PR #6, #7, #8, #9 merged

- [x] Dashboard v2: usage stats, latest audit status, CTAs
- [x] Audit detail page: /app/projects/[projectId]/audits/[runId]
- [x] Billing prep page: /app/billing with plan comparison
- [x] Centralized plans/usage system (free/starter/pro)
- [x] Auth rate limiting (15 min window, 10 attempts per email)
- [x] Password strength validation (8-128 chars, upper+lower+digit)
- [x] Session/job cleanup helpers and script
- [x] Operations docs: backup/rollback, smoke checklist
- [x] Smoke script: scripts/smoke-public-routes.sh
- [x] DX: CONTRIBUTING.md, dev-check.sh, coverage config
- [x] 278 tests passing (41 new)

## Sprint 3 — Billing & Subscription (Planned)
Status: planned

- [ ] Subscription model (Plan, Subscription, Invoice)
- [ ] Payment provider integration (Zarinpal/Stripe)
- [ ] Checkout flow with plan selection
- [ ] Invoice generation and history
- [ ] Usage metering and overage handling
- [ ] Plan upgrade/downgrade flow
- [ ] Subscription management page
- [ ] Webhook handling for payment events
- [ ] Email notifications for billing events
- [ ] Trial period support

## Sprint 4 — Team & Collaboration (Planned)
Status: planned

- [ ] Team invitations with email flow
- [ ] Role-based access control (OWNER/ADMIN/MEMBER/VIEWER)
- [ ] Team management page
- [ ] Shared projects across team
- [ ] Activity log for team actions
- [ ] Permission enforcement in API and UI
- [ ] Audit assignment to team members
- [ ] Comment system on findings
- [ ] Export sharing with team

## Sprint 5 — Advanced Features (Planned)
Status: planned

- [ ] Scheduled audits (cron-based)
- [ ] Audit comparison across time
- [ ] PDF export for reports
- [ ] White-label report customization
- [ ] API keys for programmatic access
- [ ] Webhook notifications for audit completion
- [ ] Custom audit rules engine
- [ ] Alert system for critical findings
- [ ] Integration with popular CMS platforms
- [ ] Mobile-responsive dashboard improvements
