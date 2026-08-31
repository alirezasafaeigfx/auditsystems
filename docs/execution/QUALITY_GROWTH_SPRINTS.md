# Audit quality and growth — execution cards

> For agentic workers: execute the existing plan task by task with the available executing-plans workflow and actual independent review. Reuse the approved design; do not re-plan the project or install a new agent/provider to proceed.

Goal: make Audit a trustworthy, understandable Persian website-checking product that earns relevant search demand through real usefulness.

Architecture: improve existing scanner, report, content and measurement boundaries. Share route/visual/quality contracts with ASDEV, not its database, auth, CSS framework or deployment.

Tech stack: the locked Next.js/React/TypeScript, Prisma/PostgreSQL, custom CSS, Vitest, pdf-lib and existing safe fetcher. Browser tooling is added only through the bounded engineering admission if missing.

Spec: [shared quality/growth contract](../strategy/PAIRED_QUALITY_GROWTH_CONTRACT.md). Selector: [Audit roadmap](../roadmaps/AUDIT_PUBLIC_EXPERIENCE.md). Status: [work ledger](QUALITY_WORK_LEDGER.md). These cards extend AU-01…07; they do not reset that queue.

## Global execution rules

Before work bind each criterion to the real candidate/files and a proven gap. Reuse correct implementation and valid evidence. For behavior: reproduce a failing case, make the complete correction, run focused tests, inspect the built route, repair, review and satisfy actual integration checks. Copy/style uses content/visual inspection, not source-string tests. Every card inherits the shared quality matrix, privacy boundaries and plain Persian requirements.

Paths marked **new if absent** are proposed, not already implemented. Prefer a suitable existing artifact/harness after inspection. Use a disposable PostgreSQL database and fixture targets only; never run audit/lead/payment/cleanup scripts against customers or Production to prove a task. Scope gates and runtime permissions remain effective.

## AU-08 — Current baseline, category benchmark and acceptance tooling

Owner: coordinator/QA/SEO. Dependency: current paired docs accepted or used as the owner's working spec. Companion: ASDEV GR-01.

Files: this ledger, current test/workflow configuration and existing verification tooling. **New if absent:** `docs/quality/BASELINE.md`, `docs/quality/SEARCH_INTENTS.md`, `scripts/validate-quality-evidence.mjs` with a focused negative-test suite if no equivalent verifier exists.

- [ ] Reconcile actual main, open PRs, AU-01…07 evidence and deployed identity separately. Preserve real existing queue/safe-fetch/report/content features. Read old SEO “Done” as history until current evidence supports it.
- [ ] Capture a bounded baseline: three relevant Persian and three international category references, dated same-task observations, existing indexable routes, 12 priority intent groups and known missing measurements. Agree the intent owner map with ASDEV; do not duplicate its service pages or claim invented keyword volumes.
- [ ] Map all applicable AU acceptance criteria to a local evidence manifest using the engineering schema. Implement/reuse validation of exact identity, required criteria, actual command results, hash/retrieval fields and reviewer type. Missing security/coverage/SEO evidence cannot be PASS; lab samples cannot become field CWV and fake data cannot become growth.
- [ ] Negative fixtures reject unknown IDs, incomplete task criteria, false success from skipped/failed checks, mismatched SHA, missing artifact, self-review as independent and fabricated current rankings. A valid scoped docs/unit fixture does not need unrelated final UI or future traffic data.
- [ ] If browser/CI tooling is missing, prepare and test one bounded project-local harness under the engineering guide; preserve current gates. A queued runner is a concrete blocker for hosted acceptance, not permission to bypass it. Run actual verification and independent review before claiming the harness is enforced.

Exit: current evidence map, usable baseline and acceptance validation. No customer data or fabricated scorecard. After this initial pass, implement the highest-priority ready defect in the same run. Rollback: scoped tooling/docs revert.

## AU-09 — Technical SEO with private reports kept private

Owner: SEO/FE. Dependencies: AU-08 route inventory; align with AU-01 access enforcement and ASDEV GR-02 intent policy. Local safe SEO preparation need not wait for a release.

Files: `src/lib/seo.ts`, `src/lib/seoMeta.ts`, `src/lib/seoPolicy.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, public page metadata and existing `src/lib/seo*.test.ts`. **New if absent:** `e2e/seo-public-contract.spec.ts` using the admitted browser harness.

- [ ] Inventory root/audit/sample-report/guides/blog/landing/service-intent routes and FA/EN counterparts. Classify indexable, public-noindex and private surfaces; include report tokens, comparisons, accounts/admin, login/unlock/success/failed routes and query variants.
- [ ] Extend existing helper tests with real rendered/HTTP cases: wrong host/canonical, nonexistent EN variant, duplicated landing intent, stale/fictional lastmod, private/draft/failed route in sitemap, canonical to the wrong product, soft 404 and schema contradicting visible content. Detect client-injected JSON-LD in the rendered DOM; a stripped web extract is insufficient to claim schema absence.
- [ ] Repair demonstrated defects; preserve current helpers and routes. No public token report or customer URL in sitemap/schema/evidence. `noindex` complements application access controls and cannot secure a report; robots-blocked pages cannot deliver readable noindex directives to crawlers.
- [ ] Run `pnpm exec vitest run src/lib/seo.test.ts src/lib/seoMeta.test.ts src/lib/seoPolicy.test.ts`; build and exercise route/HTTP/browser matrix. Inspect generated sitemap/robots and locale reciprocity. Record every checked template and remaining gap.

Exit: intended public pages have coherent discovery/metadata, private content stays protected and excluded, and existing translation/content decisions remain truthful. Google indexing is still a separate observation. Rollback: metadata/route-policy revert with access/sitemap regression verification.

## AU-10 — Helpful Persian education tied to real findings

Owner: content/UX with a correctness reviewer. Dependencies: AU-08 intent map, AU-02 scoring/coverage policy and AU-03/05 language/layout; publish only after AU-09 readiness.

Files: `src/content/guides.ts`, `src/content/blog/`, existing public guides/blog/landing routes, `src/lib/summary.ts`, `src/lib/rules.ts` for wording only where justified, and sample-report content. **New if absent:** `docs/quality/CONTENT_REGISTER.md`.

- [ ] Audit current pages and choose keep/improve/consolidate/do-not-publish with intent/evidence. Reuse substantive content; no mass article generation or near-identical “security check”/“security audit” landing pages without distinct purpose.
- [ ] Fully improve one existing core “how to check a website/read the result” guide and three supporting existing articles covering real observed SEO, speed and security limitations. Each explains a symptom, safe practical step, verified example, what Audit does/does not measure and a relevant next action. These are complete useful pages, not arbitrary word quotas.
- [ ] In report explanations, cover the most important actual rule categories: plain title, why it matters, action, evidence and uncertainty. Security observations are not automatically proven vulnerabilities; client-only schema/unfetched robots/sitemap cannot be asserted absent. Preserve AU-02 limits.
- [ ] Record actual author/reviewer, source and update date per page. Label synthetic examples, protect customers and make EN meaning complete. Do not invent first-hand credentials, free features, customer wins or ratings.
- [ ] Inspect rendered Persian, mixed-direction examples and disclosures across mobile/desktop. Review comprehension through the shared protocol; no fabricated human testing. Prepare valid drafts where publishing evidence/permission is unavailable, and identify that limit.

Exit: reviewed core guide plus three substantive improvements and consistent report explanation policy; published status accurately reported. Rollback: existing content versions/revert, not a CMS migration.

## AU-11 — Useful and reliable end-to-end audit delivery

Owner: correctness/QA with worker capability. Dependencies: AU-01/02/05/06; reuse existing queue, safe-fetch and report tests. Companion utility verification: ASDEV GR-04.

Files: `src/worker/audit.handler.ts`, `src/worker/queue.postgres.test.ts`, `src/lib/audit-enqueue.postgres.test.ts`, `src/lib/scheduled-audit-runner.postgres.test.ts`, `src/lib/scoring.test.ts`, `src/lib/reportShare.test.ts`, existing report/API/PDF/comparison tests and `src/fixtures/audit/`.

- [ ] Prove URL entry → accepted enqueue → worker result → authorized report → optional export/implementation handoff with disposable targets/database. HTTP health or a mocked response alone cannot establish this path.
- [ ] Exercise valid/malformed/disallowed URL, safe redirect, unreachable target, timeout, worker retry/restart, duplicate enqueue/retry, partial coverage, absent result, expired/revoked access and long findings. Preserve IP pinning/SSRF/rate limits; do not expand scanning to private networks.
- [ ] Include the reproduced scoring invariant: a CRITICAL finding plus a LOW failure must not score better than the same CRITICAL finding under the same policy/coverage. Unknown checks do not become 100/100. Verify legacy/version behavior and equivalent HTML/API/PDF/comparison semantics.
- [ ] Check error recovery retains visitor input and does not create phantom success, duplicate jobs/leads or indefinitely “running” UI after a terminal failure. Label queue timing as measured/unknown rather than fake percent or guaranteed duration.
- [ ] Run focused tests, PostgreSQL integration and built-app browser flow under the declared toolchain. Measure repeated local runs for completion/error and resource use, with environment and sample size; do not extrapolate to production throughput. Payment acceptance requires an authorized sandbox and stays separately blocked if absent.

Exit: reproducible useful results and safe recovery, matching outputs and independent review. UI polish cannot compensate for access/correctness failure. Rollback: bounded application revert; do not rewrite stored reports or perform live migrations to earn a checkbox.

## AU-12 — Trustworthy measurement and usable growth scorecard

Owner: analytics/QA. Dependencies: AU-08 definitions, AU-04 route semantics and relevant AU-11 completion events. Live collection has its own real authorization.

Files: `src/lib/analytics.ts`, `src/lib/metrics.ts`, `src/lib/__tests__/analytics.test.ts`, `src/lib/metrics.test.ts`, `src/app/api/analytics/rum/route.ts`, existing monitoring/export code. **New if absent:** `docs/quality/MEASUREMENT.md`; one reusable local import/report adapter only when missing.

- [ ] Define entry, enqueue accepted, actual usable report ready, report understood/next action where observable and error events. Keep navigation and enqueue separate from successful completed audits; qualify denominator and source. Do not add persistent cross-domain identity.
- [ ] Verify consent, duplicate events, failure/retry and rejection of PII/customer URL/report tokens in payloads. Inspect current metric units: CLS is unitless, timing is milliseconds; in-memory process counters are not a durable 28-day field dataset or accurate p75 distribution by themselves.
- [ ] Create/reuse a scorecard from authorized exports with date/device/country/locale/cohort and coverage. Missing Search Console/analytics access or low traffic remains UNVERIFIED. Test parsing using explicit fixtures, then only display real measurements when their source exists.
- [ ] Run `pnpm exec vitest run src/lib/__tests__/analytics.test.ts src/lib/metrics.test.ts` and the relevant new negative cases; inspect actual local payloads. Distinguish field CWV from three-run lab proxies and emulation from hardware.

Exit: tested measurement plumbing and a reproducible scorecard path, with live activation/data status explicit. No new paid vendor, credentials or large metrics infrastructure requirement. Rollback: scoped collection/reporting change, preserving existing consent.

## AU-13 — Measured category growth, without an endless work loop

Owner: coordinator/SEO. Dependencies: AU-09…12 implementation; verified deployment and dated observations for outcome claims. Companion: ASDEV GR-06, with distinct query owners.

Files: `docs/quality/BASELINE.md`, `SEARCH_INTENTS.md`, `MEASUREMENT.md`; **new if absent** `docs/quality/GROWTH_REVIEW.md`; one selected existing content/UX/SEO concern.

- [ ] Compare the frozen 12-intent cohort, non-brand visibility, useful completed audits, qualified enquiries, error/timeout and field quality using available sources. Preserve misses and missing data; do not quietly replace the cohort or claim universal rank from average position.
- [ ] Choose one evidence-supported useful improvement. State hypothesis, changed URLs, primary metric, safety/quality guardrails and a comparable observation window; implement and verify the complete correction within its existing concern.
- [ ] Use comparable 28-day windows if enough data exists. Otherwise preserve a runnable report and a precise next observation condition; mark this lane AWAITING_OBSERVATION and finish other safe work. No endless polling, fake A/B significance or nightly article generation.
- [ ] Prepare genuinely useful source-backed assets for discovery. No paid links, spam, fabricated testimonials, unauthorized outreach or publication. Search leadership requires repeated scoped evidence under the shared contract, not green CI or this plan's existence.

Exit: one genuine review/improvement or a precise data blocker; implementation and observed growth verdicts stay separate. Rollback: selected page/behavior with the experiment record preserved.

## First concrete correctness check

AU-02 owns this regression; AU-11 reuses it and must not create a competing score policy. The current interface at the reviewed baseline supports this test:

```ts
const critical = [{ category: "SECURITY", severity: "CRITICAL" }] as const;
const before = calculateScore([...critical]);
const after = calculateScore([
  ...critical,
  { category: "SEO", severity: "LOW" },
]);
expect(after.overall).toBeLessThanOrEqual(before.overall);
```

Add it to the existing `src/lib/scoring.test.ts`, observe the actual failure, then repair the agreed version/coverage policy and its callers. Run `pnpm exec vitest run src/lib/scoring.test.ts src/lib/rules.test.ts src/lib/reportShare.test.ts` as a focused starting point, not whole-product acceptance. If current code already fixes it, reuse its test/evidence and choose the next missing criterion.
