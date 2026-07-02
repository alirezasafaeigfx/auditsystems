# Changelog

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
