# Changelog

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
