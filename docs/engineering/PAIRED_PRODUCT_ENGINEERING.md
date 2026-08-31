# Audit Systems — engineering for paired public experience

Updated: 2026-08-31. Supporting guide for [the canonical Audit roadmap](../roadmaps/AUDIT_PUBLIC_EXPERIENCE.md).

The reviewed companion is [ASDEV paired experience v2](https://github.com/alirezasafaeigfx/alirezasafaeisystems/blob/7a8876342aebc6b6c837ce093edfef08e6d41927/docs/engineering/PAIRED_PRODUCT_EXPERIENCE.md), pinned to immutable commit `7a8876342aebc6b6c837ce093edfef08e6d41927`. The [shared quality/growth source](https://github.com/alirezasafaeigfx/alirezasafaeisystems/blob/7a8876342aebc6b6c837ce093edfef08e6d41927/docs/strategy/PAIRED_QUALITY_GROWTH_CONTRACT.md) and [identical local mirror](../strategy/PAIRED_QUALITY_GROWTH_CONTRACT.md), version `2026-08-31.2`, have SHA-256 `bee60bd6f8fe776d5ab0472ed087ab6edfbc8bad706e24f7eb9149e5cb15f766`. This reviewed docs candidate extends acceptance without changing the v1 route wire contract; it is not proof of integrated application behavior or deployment. Verify the immutable source/hash when updating the mirror; never use a floating branch as accepted provenance.

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

## SEO, content and useful measurement

Use [AU-08…13 execution cards](../execution/QUALITY_GROWTH_SPRINTS.md), [project rules](../governance/REPOSITORY_RULES.md) and the [work ledger](../execution/QUALITY_WORK_LEDGER.md). Preserve existing helpers and stores:

| Concern | Source / verification boundary |
|---|---|
| Technical SEO | `src/lib/seo.ts`, `seoMeta.ts`, `seoPolicy.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, existing helper tests plus actual built-route HTTP/DOM |
| Useful Persian content | `src/content/guides.ts`, `src/content/blog/`, public landing/guides/blog routes; review intent, facts and actual rendered locale content |
| Existing measurement | `src/lib/analytics.ts`, `src/lib/metrics.ts`, `src/app/api/analytics/rum/route.ts`, analytics/metrics tests; verify consent, units, source and retention |
| Real audit utility | Existing queue/worker/PostgreSQL tests, disposable fixture targets and report/export access paths; never live customer jobs |

The shared contract links checked Google Search Central, web.dev and WCAG sources. Use current primary documentation for exact rules, not fixed character counts, outdated tool recommendations or unverified claims from a skill. Rendered JSON-LD may not appear in a web text extract; inspect DOM before asserting absence. Private-route noindex/robots are not authorization. CLS is unitless; counters in one process do not establish field history or precise p75 by themselves.

Project-local skills: verify/sync the locked sources before reading the applicable `seo-audit`, `content-strategy`, `site-architecture` or `analytics` skill through the existing marketing adapter. Only load skills for the actual concern; no global installation, paid service, automatic outreach or unrequested account setup. Skill guidance cannot override the owner's simple-Persian, truth, privacy or authorization requirements.

Use the shared three-run lab profile and independent visual/accessibility checks for AU-07. Record Audit's measured route transfer/JS sizes and regressions from AU-08; do not transplant the main site's GPU allowance as permission to add WebGL. Missing field traffic is AWAITING_OBSERVATION, not an excuse to label a local proxy field INP.

## Evidence shape and enforceable boundaries

AU-08 must reuse/implement a project-local validator and negative tests before claiming the new criteria are automatically enforced. This prose is the contract, not the implementation. Evidence record fields:

| Field | Required meaning |
|---|---|
| identity | Repository, task IDs, base/candidate SHA, capture time, toolchain/environment, dirty state, companion candidate for paired flows |
| criteria | Every applicable task criterion, implementation/observation reference and verdict; unknown IDs or missing required criteria fail |
| commands | Actual command/workdir/start/end/exit and pass/fail/skip counts; no failed/skipped check hidden as success |
| artifacts | Sanitized retrievable URL, SHA-256, capture conditions/locale/viewport/state and any expiry; hashes checked against actual retrieval |
| reviews | Actual reviewer identity/type/scope SHA, findings and disposition; self-review is not independent review |
| reuse | Original source identity, tested inputs and explicit equivalence rationale; old SHA is never relabeled current |
| release | Actual deployed identity/workflow/previous release/rollback evidence when relevant; main is not a deployment record |
| observation | Real source/window/cohort/device/country/denominator and limitations when claiming field outcomes; absent sources stay pending |

Use separate implementation, release and observation verdicts. A scoped unit does not need unrelated whole-product evidence; final AU-07 cannot omit applicable product criteria. Store the manifest with candidate artifacts in the existing test-results path or a bounded new `test-results/quality/<candidate-sha>/` directory if none exists. Publish only sanitized durable evidence. A valid manifest cannot certify aesthetic quality, genuine participants or the truth of a forged observation; independent inspection remains required.
