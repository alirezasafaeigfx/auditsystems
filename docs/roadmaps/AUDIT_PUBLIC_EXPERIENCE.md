# Audit Systems — canonical paired-product experience roadmap

Revision: 2026-08-31.2. Scope: this product and its agreed interface with ASDEV. This is the only task selector for this public-experience/quality/SEO/growth mission; it does not replace existing operational runbooks or authorize deployment.

Read [AGENTS.md](../../AGENTS.md) and [engineering/paired contract](../engineering/PAIRED_PRODUCT_ENGINEERING.md). Old roadmap/status documents are historical until their claims are reconciled against source and retrievable evidence. No percent-complete estimate is justified by the current record.

## Shared goal

Become a first-choice website-checking product for ordinary Iranian visitors, with UI/UX, plain Persian, actual usefulness, accuracy, reliability, speed and SEO at leading international quality. The [shared quality/growth contract](../strategy/PAIRED_QUALITY_GROWTH_CONTRACT.md) defines the complete acceptance matrix and search-intent ownership. Rank #1 is an ambition for evidenced relevant queries, never a guaranteed outcome or a CI certificate.

Keep the existing AU-01…07 tasks and working implementation. [AU-08…13 cards](../execution/QUALITY_GROWTH_SPRINTS.md) extend them; [the ledger](../execution/QUALITY_WORK_LEDGER.md) tracks real progress. This revision prepares work and corrects task selection; it does not claim to fix application code or change Production.

## Baseline and real progress

Source reviewed: `0fb6edcc483a701b0904c5d0aa38a8b3ab9dbf9a`. The current repository contains worker/queue processing, safe URL fetching, findings/summary/report/PDF paths, lead intake/admin, accounts/projects, subscription/payment abstractions, invitations, scheduling and comparisons. These are implemented code, not blanket production acceptance. Existing old documents both overclaim some capabilities and still call implemented features planned.

Observed on 2026-08-31: live Home, automated entry, sample report and specialist form render; both health/readiness return 200. Latest main-gate run `33386286948` is queued; main has no branch protection/ruleset at inspection. Exact deployed source identity, payment/worker round trip, customer report privacy and rollback were not tested against live data. No live lead/audit/payment was submitted in this review.

Existing strengths to preserve: real safe-fetch DNS validation/IP pinning and redirect checks; explicit fictional sample-report disclaimer; substantive worker and account/queue tests; existing custom CSS and theme support. Do not restart these components to satisfy a design task.

## Acceptance blockers and priorities

Source review found inconsistent report access enforcement, non-monotonic scoring, insufficient-coverage scores, unverified robots/sitemap assumptions, qualification failure handling, FA/EN gaps and unsupported marketing promises. Scoped local dependency audit returned high-severity advisories; audit count is not proof of runtime exploitability. Remediate applicability and record resolved/unresolved paths before release; do not silently allowlist them.

These blockers prevent acceptance/release, not independent safe UI preparation. Detailed private access-control findings stay out of public issue comments, logs and screenshots.

| ID | Complete outcome | Dependencies / paired mapping |
|---|---|---|
| AU-01 | Consistent report access and trustworthy verification baseline | Ready; EC-01 |
| AU-02 | Monotonic, coverage-aware truthful results | Ready; EC-01/04 |
| AU-03 | Shared visual family and plain Home/request copy | Ready in isolated non-overlapping paths; EC-02 |
| AU-04 | One owner per intent and safe bilingual round trip | AU-03; ASDEV EC-03 |
| AU-05 | Understandable report/sample/comparison/PDF experience | AU-02/03; EC-04 |
| AU-06 | Recoverable qualification and complete state/localization matrix | Can begin before AU-03; integrate after AU-03/04; EC-03/04 |
| AU-07 | Paired acceptance, exact releases and honest closure | AU-01…06; ASDEV S5/EC-05 |
| AU-08 | Real baseline, bounded references/intent map and evidence validation | Ready; ASDEV GR-01 |
| AU-09 | Public technical SEO plus protected-report exclusion | AU-08 inventory; AU-01 access policy; ASDEV GR-02 |
| AU-10 | Source-backed plain Persian core guide and useful supporting content | AU-08/02/03/05; publishing after AU-09 |
| AU-11 | Complete reliable audit→result→action with consistent coverage and recovery | AU-01/02/05/06; reuse queue/report tests; ASDEV GR-04 |
| AU-12 | Consent-safe real measurement and reproducible scorecard | AU-08, AU-04 semantics; actual result events from AU-11; ASDEV GR-05 |
| AU-13 | One measured growth improvement or honest observation checkpoint | AU-09…12 implementation; release/data for outcome claims; ASDEV GR-06 |

Initial implementation status of every AU task: OPEN. This planning change does not implement a fix or award acceptance.

The updated AU-07 candidate acceptance also includes applicable AU-08…12 implementation criteria. AU-13 future observations follow release and do not create a circular release dependency. Missing traffic is AWAITING_OBSERVATION, not a reason to fake growth or stop safe coding. AU-08 admits bounded evidence/browser tooling with negative checks where missing, not an unrelated framework or security-gate rewrite.

AU-07 uses the ASDEV peer's required compatible implementation/route inputs, not completion of EC-05 or ASDEV's release. Each product's accepted candidate can follow its own release gates; neither local release waits for the other's closure task. EC-05 aggregates final pair receipts/round-trip evidence after both releases. This distinction prevents a circular AU-07↔EC-05 dependency.

## Task cards

### AU-01 — Report access and verification baseline

Scope: existing report access helpers, HTML/API/comparison/export consumers and focused tests; dependency/CI repair in a separate concern where necessary. Inspect `src/lib/reportShare.ts`, `src/app/audit/r/`, `src/app/en/audit/r/`, `src/app/compare/`, `src/app/api/reports/`, `src/app/api/pdf/`, `package.json`, lockfile and current workflows. Do not change payment entitlement or schema incidentally.

- [ ] With disposable fixtures, check every report surface for protected/unprotected, expired/revoked, absent, unauthenticated and authorized states; require equivalent access decisions and no protected content in HTML/RSC/JSON/export before authorization. Never use customer tokens as fixtures.
- [ ] Implement shared enforcement without leaking content while showing a challenge. Keep password attempt limits, consent and caches safe. Verify correct credentials succeed and failure never increments a successful-view count.
- [ ] Reconcile dependency advisories against actual locked versions and usage; upgrade only compatible affected dependencies within admitted scope, with regression/build evidence. Unsupported major migrations require a prepared decision, not a silent upgrade.
- [ ] Diagnose why main-gate is queued using current runner/check metadata; prepare a minimal infrastructure fix separately. Required checks must really run on the candidate. Do not claim queued/cancelled as passed or change settings automatically.

Exit: consistent access tests, truthful dependency gate, actual terminal hosted result or precise blocker. Database/payments/runtime changes are not authorized by this task description.

### AU-02 — Result correctness before visual authority

Paths: `src/lib/scoring.ts`, `src/lib/summary.ts`, `src/lib/rules.ts`, `src/lib/performance-evidence.ts`, `src/worker/audit.handler.ts`, existing scoring/summary/evidence tests. Use a small independent correctness PR; do not sweep the whole scanner.

- [ ] Add regression cases showing that adding a LOW/INFO failure cannot improve a score and removing a failure cannot worsen it. Unknown/failed measurement must not become 100/100.
- [ ] Define score policy against known checks/coverage, not findings count. Preserve existing stored reports with an explicit version/legacy distinction; do not rewrite historical data in this UI mission.
- [ ] Make performance availability/limitations authoritative in report summaries. If no validated scoring policy exists, withhold that numeric score and explain which checks ran.
- [ ] Do not infer robots/sitemap absence from HTML links. Either perform bounded safe verified requests with existing SSRF protections or label the check not performed. Test a valid unlinked file, missing file, inaccessible file and misleading link text.
- [ ] Keep report, PDF and comparison aligned. Record fixtures, expected results, real test output and independent correctness review.

Exit: no unsupported pass/score/absence assertion; reproducible invariants and equivalent output across surfaces. No invented customer measurements.

### AU-03 — Distinct product, shared identity

Paths: `src/app/page.tsx`, `src/app/en/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, existing `src/components/` shell, IntentRouter and CTA components. Follow engineering source mapping, not an imported new design system.

- [ ] Establish side-by-side real-route ASDEV/Audit compositions with matching font/token roles and a clear maker/product relationship; retain Audit as a task-focused product.
- [ ] Hero has one primary automated action and one visibly different specialist option; remove duplicate same-label/same-destination buttons. Make limitations and next steps easy to understand.
- [ ] Replace unsupported uptime/security/time/privacy assertions with precise plain-language descriptions. Do not imply that scanning guarantees safety or complete coverage.
- [ ] Create authored mobile layout, one main landmark, readable input/buttons, reduced-motion behavior and coherent light/dark states. Technical detail is optional.
- [ ] Inspect FA/EN 390/768/1440 screenshots and 360px edge behavior. Review typography/RTL order/focus/contrast and compare with the ASDEV candidate before marking composition accepted.

Exit: working preview and copy/design review. Static mockups are design aids, not delivery. No site-wide WebGL, Tailwind replacement or runtime migration.

### AU-04 — Safe paired visitor journey

Paths: `src/lib/audit-cta-registry.ts`, `src/lib/intent-router-cta.ts`, `src/components/IntentRouter.tsx`, `src/components/HeroAuditForm.tsx`, `src/app/qualification/QualificationForm.tsx`, locale page wrappers and CTA tests. Add browser journey coverage using the admitted project-local harness if necessary.

- [ ] Implement the pinned paired route table: automated checks here, specialist requests here, implementation enquiries on ASDEV. Never redirect all intent IDs to one qualification form.
- [ ] Preserve locale and validated origin/placement/offer. Remove fictional target prefill from “my website” CTAs. Never pass report tokens, PII or private URLs to ASDEV/query analytics.
- [ ] Send “help fix this” to ASDEV's implementation enquiry instead of home. Preserve legacy entry routes and existing APIs; no shared login/DB requirement.
- [ ] Test normal routes, direct links, Back, consent-denied, destination outage and rejected unsafe attribution/destination values. Verify both actual candidate apps; stubs alone are insufficient for final paired acceptance.

Exit: one non-looping route per intent, both languages, no duplicate form and no sensitive cross-domain payload.

### AU-05 — Reports people can act on

Paths: actual report FA/EN pages, `src/components/sample-report/`, `src/lib/sample-report/`, comparison page and PDF rendering. Preserve fictional sample labels and existing access enforcement from AU-01.

- [ ] First screen explains the result, what matters most and the next action. Separate confirmed observations, hypotheses and unmeasured areas.
- [ ] Show short plain Persian titles/business effect/actions before technical details. Localize status/grade/severity and keep necessary technical evidence in an accessible disclosure.
- [ ] Keep sample/real/EN/PDF conceptually consistent without presenting sample facts as real. Avoid promoting every missing header to a proven vulnerability.
- [ ] Test empty, partial, failed, completed and legacy reports; inaccessible/protected states must not leak report content. Check print layout and long mixed-direction URLs.
- [ ] Add the safe implementation CTA, with no client data in the link. Inspect mobile and desktop result/report screenshots.

Exit: truthful, comprehensible, accessible reports with consistent coverage and clear follow-through; independent source/copy review.

### AU-06 — Qualification resilience and language parity

Paths: `src/app/qualification/QualificationForm.tsx`, FA/EN wrappers, existing lead API contract and focused UI/browser tests.

- [ ] Reproduce network rejection, non-JSON response, validation failure, 429 and server error with mocks. User entries survive and submit becomes usable again; never leave a permanent submitting state.
- [ ] Implement bounded error handling, accessible error focus/status and explicit retry. Do not silently resubmit, duplicate leads or treat a navigation as success.
- [ ] Pass locale into labels/errors/success links; EN must contain an English form and stay EN after success. FA copy avoids internal qualification/operator terms.
- [ ] Test submitting/disabled/success/error with disposable endpoints. Do not submit real leads or claim end-to-end delivery from a mocked response.

Exit: all failure/success states recover predictably and both locales are complete.

### AU-07 — Evidence and independent release

- [ ] Record exact Audit and ASDEV candidates, checks, environment, commands/counts, actual screenshots/recordings and hashes. Have an independent reviewer inspect code, copy and real visuals; obtain owner visual disposition on the complete preview.
- [ ] Verify actual routes at FA/EN 390/768/1440 plus 360px, light/dark, keyboard, reduced-motion, no-JS essential content and slow/error states. Verify core worker/report flow in disposable environment and guarded payment sandbox only when authorized.
- [ ] Measure LCP ≤2.5s, CLS ≤0.1, field INP p75 ≤200ms when available; label lab proxies honestly. Document current transfer sizes and no unnecessary graphics runtime. Do not substitute loose Lighthouse warnings.
- [ ] Persist sanitized non-expiring evidence; queued CI, inaccessible local files and expiring artifacts remain gaps. A full suite may still be required despite focused tests passing.
- [ ] Follow current runtime authorization/runbook. Verify deployment identity, previous release and actual rollback status separately; this plan does not authorize migrations, payment activation, restarts or production deployment.
- [ ] Check the round trip after each independent release and after both. Old links must work during partial rollout; rollback of either side must preserve the other's safe navigation.

Exit: all applicable product dimensions accepted; no security/truth blocker or unknown release identity. If only one product is accepted, paired program remains incomplete.

## Original experience grouping

1. Safety/truth: AU-01/AU-02, plus isolated AU-06 failing-state preparation.
2. Visible product: AU-03; ASDEV reuses and repairs PR #26. No artificial wait for deployment to design.
3. Complete journey: AU-04/AU-05/AU-06 with paired browser fixtures and actual-route review.
4. Acceptance/release: AU-07 + ASDEV EC-05/S5; independent releases, no deployment coupling.

No dates or invented velocity. Each task has a complete acceptance unit, not a line-count target. Record real progress in its PR and reconcile this roadmap on integration; do not create daily competing queues.

## Current paired execution batches

| Batch | Audit task ownership | ASDEV counterpart | Exit evidence |
|---|---|---|---|
| 1 — real state, safety and truth | AU-01/02/08; AU-06 failure reproduction | EC-01/GR-01, #26/#27 | Correctness/access fixes and actual baseline/criteria |
| 2 — clear identity and visitor paths | AU-03/04/06; AU-09 preparation | EC-02/03, GR-02 preparation | Real FA/EN route flow and coordinated usable layouts |
| 3 — useful product and content | AU-05/10/11 | EC-04, remaining S2/S3/S4, GR-03/04 | Correct actionable reports/content and complete failure recovery |
| 4 — measurement and acceptance | AU-09/12, AU-07 candidate checks | GR-02/05, S5-01…04 | Raw quality/SEO/measurement evidence, independent review and owner preview |
| 5 — independent governed release | AU-07 release | S5-05…07/EC-05 | Both actual release identities, compatible journey and rollback truth |
| 6 — observed improvement | AU-13 | GR-06 | One evidence-led correction or AWAITING_OBSERVATION |

This current sequence extends the original grouping without replaying it. Dependencies and path ownership determine readiness; security fixes do not wait for marketing research. Use [the execution prompt](../../prompts/codex/PAIRED_SITES_YOLO_LOOP.md) and keep one authoritative task record per real change.
