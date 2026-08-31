# Audit Systems — engineering for paired public experience

Updated: 2026-08-31. Supporting guide for [the canonical Audit roadmap](../roadmaps/AUDIT_PUBLIC_EXPERIENCE.md).

The shared design, route ownership, attribution, copy and paired acceptance contract is [ASDEV paired experience v1](https://github.com/alirezasafaeigfx/alirezasafaeisystems/blob/f7abc0d9041ee0d085cdd1ea8d7b998d07418faa/docs/engineering/PAIRED_PRODUCT_EXPERIENCE.md), pinned to reviewed companion commit `f7abc0d9041ee0d085cdd1ea8d7b998d07418faa`. This documentation candidate is not yet integrated. Pin an explicitly reviewed successor when the contract changes; do not follow a floating branch as an accepted baseline.

## Stack and source map

Keep Next.js App Router/React, TypeScript strict, Prisma/PostgreSQL, custom CSS variables, pdf-lib and Cheerio. Exact versions are in `pnpm-lock.yaml`. Keep project-local pnpm `9.15.0`; inspect the chosen Node runtime against current dependency engines and CI (main-gate currently uses Node 22). The review workspace used Node 24.19.0/pnpm 11.19.0 for selected tests; that is not a claim of matching the production toolchain.

| Concern | Existing implementation |
|---|---|
| Home/locale/shell | `src/app/page.tsx`, `src/app/en/page.tsx`, `src/app/layout.tsx` |
| Style/token roles | `src/app/globals.css`, existing theme components |
| Automated entry | `src/components/HeroAuditForm.tsx`, `src/app/audit/AuditPageClient.tsx` |
| Specialist enquiry | `src/app/qualification/QualificationForm.tsx`, FA/EN page wrappers, `src/app/api/leads/route.ts` |
| CTA semantics/attribution | `src/lib/audit-cta-registry.ts`, `src/lib/intent-router-cta.ts`, `src/lib/audit-cta-tracking.ts`, `src/components/IntentRouter.tsx` |
| Actual result | `src/app/audit/r/[token]/page.tsx`, EN equivalent, `src/app/api/reports/[token]/route.ts` |
| Example result | `src/components/sample-report/`, `src/lib/sample-report/` |
| Comparison/export | `src/app/compare/[tokenA]/[tokenB]/page.tsx`, `src/app/api/pdf/[token]/route.ts` |
| Access and safe fetching | `src/lib/reportShare.ts`, `src/lib/safeAuditFetch.ts` |
| Results/coverage | `src/lib/scoring.ts`, `src/lib/summary.ts`, `src/lib/performance-evidence.ts`, `src/lib/rules.ts`, `src/worker/audit.handler.ts` |

Reuse these boundaries. Do not create a second scanner, analytics system, report authorization scheme or unrelated component library. Put a small shared helper at the actual duplicated boundary only when required by tests.

## Sources, packages and skills

- Framework: use official [Next.js](https://nextjs.org/docs) and [React](https://react.dev/reference/react) documentation for the locked versions and server/client boundaries.
- Data: official [Prisma](https://www.prisma.io/docs) and [PostgreSQL](https://www.postgresql.org/docs/) documentation; preserve PostgreSQL schema/migration policy. Shared branding does not imply sharing ASDEV's SQLite data.
- Existing report dependencies: official [pdf-lib](https://pdf-lib.js.org/docs/api/) and [Cheerio](https://cheerio.js.org/docs/intro). Preserve safe-fetch boundaries around HTML parsing.
- Verification: existing [Vitest](https://vitest.dev/guide/) tests. A local [Playwright](https://playwright.dev/docs/intro)/axe browser harness may be added only in a bounded test-tooling PR if existing tooling cannot produce required real-route evidence; pin compatible versions and record license/security/cost. No global install or unspecified latest package.
- UI: existing CSS/semantic HTML first. Map ASDEV font/color/spacing/focus/motion roles; keep custom CSS instead of adopting Tailwind. No mandatory motion library for Audit forms/report pages. Main's Anime.js/Three.js admission does not automatically admit them here.
- Apply verified pinned Superpowers and UI/UX project skills through AGENTS.md; do not assume availability from a skill name. Read official sources before dependency changes. The URLs above are resource pointers, not a claim of fresh compatibility/security validation.

## UX state contracts

Automated check: idle → validating → queued → running → complete, partial or failed. Reflect actual server status; no fake progress/remaining-time estimates. Describe coverage and let users recover from errors without losing their input. A network error must not create a phantom success.

Specialist enquiry: idle → submitting → success or recoverable error. Preserve fields, prevent duplicate clicks, and restore action after rejected fetch/non-JSON/429/5xx. Show plain-language, localized feedback; test with disposable/mocked endpoints, not real lead submissions.

Report: unauthorized/expired/revoked/not-ready are first-class states. Only authorized ready content can enter the report presentation. Top issues → consequence → next step → optional technical evidence. Distinguish unknown/legacy/unmeasured from passed. Never expose sensitive report context to a different domain through query parameters.

## Acceptance and runtime boundaries

Use the task cards' complete matrices. For every result, distinguish code existence, unit test, browser observation, measured performance, independent acceptance and production verification. Capture actual source SHA and pair it with ASDEV's candidate. Preserve confidentiality in evidence and do not upload authenticated traces/cookies/customer content.

Repository settings, hosted checks and exact release evidence outrank stale status prose. A queued self-hosted job is not passed. No automatic protection/settings changes, live payment activation or production deployment is authorized by this guide. Continue safe UI and unit-test work while runtime gates remain unresolved.
