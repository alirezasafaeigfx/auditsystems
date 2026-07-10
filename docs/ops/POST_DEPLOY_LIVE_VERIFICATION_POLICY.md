# Post-Deploy Live Verification Policy — AuditSystems

**Status:** Mandatory  
**Product:** ASDEV Audit / AuditSystems public application

## Rule

An AuditSystems deployment is not complete until the real live public application has been tested with real browsers and operational checks.

Build success, container/service restart, reverse proxy switch, or health endpoint alone is not enough.

## Required live checks after every deploy

### Public endpoints

- primary public URL
- www/apex behavior if configured
- HTTP to HTTPS redirect
- `/health`, `/ready`, or equivalent endpoint if present
- sitemap/robots if public SEO pages exist

### Real browser checks

Use real browser automation, preferably Playwright:

- desktop browser
- mobile viewport
- console errors captured
- page errors captured
- failed network requests captured
- screenshots for P0/P1 failures

### Critical journeys

- homepage/landing loads
- audit entry flow opens
- lead/audit submission form validates correctly
- thank-you/success page works in safe test mode if available
- report/sample-report pages work if public
- navigation and footer links work
- protected/admin pages are verified as protected, not publicly accessible

### Runtime checks

- service/process manager status
- reverse proxy status/config if available
- fresh application logs
- database connectivity if safe/read-only
- deployed commit/release id
- rollback target

## Required verdict

Every deployment report must end with exactly one verdict:

- `LIVE_VERIFICATION_PASS`
- `LIVE_VERIFICATION_PASS_WITH_WARNINGS`
- `LIVE_VERIFICATION_FAIL_ROLLBACK_RECOMMENDED`
- `LIVE_VERIFICATION_FAIL_HOTFIX_REQUIRED`
- `DEPLOY_BLOCKED_NOT_VERIFIED`

## Required report

Write a report to:

```text
docs/reports/live-verification/YYYYMMDD-HHMM-auditsystems.md
```

or:

```text
reports/live-verification/YYYYMMDD-HHMM-auditsystems.md
```

Include tested URLs, browser/device list, broken routes, console/network failures, form/journey results, logs checked, release id, rollback target, and final verdict.

## Definition of done

AuditSystems deploy is done only when live browser checks, critical journeys, health/runtime checks, and evidence report pass.
