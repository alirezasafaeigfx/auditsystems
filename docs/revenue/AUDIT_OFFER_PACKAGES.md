# ASDEV Audit Productized Offers

Status: internal operating spec for `auditsystems#25`.
Public CTA until owner approval: `Request assessment`. Do not publish public prices.

## Entry Audit

Goal: fast qualification and priority diagnosis for one active public website.

- Target customer: owner, marketer, freelancer, or small team with one public website and one urgent concern.
- Required inputs: domain, contact email, business type, primary concern, consent for public checks, optional analytics/search-console screenshots supplied by customer.
- Crawl and review scope: one domain, homepage plus up to 10 representative URLs, public HTTP/HTML headers, indexability basics, mobile rendering spot check, security header baseline.
- Included: priority findings, evidence table, severity, owner recommendation, 30-minute delivery call or async walkthrough, next-step recommendation.
- Excluded: private admin access, code changes, guaranteed SEO/ranking result, backlink audit, content rewrite, payment/security penetration test.
- Deliverable: short PDF/web report and prioritized remediation list.
- SLA: 2 business days after valid input and qualification.
- Revisions: one clarification pass for factual corrections.
- Support: 7 calendar days of async clarification on delivered findings.
- Qualification: public site is live, customer can name one business concern, and domain is reachable without login.
- Disqualification: illegal/high-risk content, private-only systems, request for guaranteed ranking/revenue, or no owner/operator contact.
- Internal delivery estimate: 2-3 hours.
- Internal cost model: operator review + report polish + call; keep private for owner pricing approval.

## Full Technical Audit

Goal: decision-ready report for teams that need a trusted remediation backlog.

- Target customer: SME, agency client, SEO team, or product team with active acquisition risk.
- Required inputs: domain, business type, primary conversion path, target audience, known issues, optional read-only exports from GSC/GA/PageSpeed.
- Crawl and review scope: one domain, up to 100 public URLs or agreed URL sample, redirects/canonical/sitemap/robots, technical SEO, security headers, performance proxies, mobile UX, accessibility spot checks, content quality signals.
- Included: executive summary, severity-ranked findings, confirmed vs hypothesis labels, evidence, impact, recommendation, owner, priority, 30-day action plan.
- Excluded: implementation, content writing, full accessibility certification, legal compliance certification, full pentest, third-party vendor negotiation.
- Deliverable: web report plus exportable PDF when the export route is healthy; implementation backlog in proposal format.
- SLA: 5 business days after valid input and qualification.
- Revisions: one correction pass and one prioritization adjustment.
- Support: 14 calendar days of async Q&A.
- Qualification: site has meaningful public traffic or commercial intent, stakeholder can approve fixes, and the report will drive an implementation decision.
- Disqualification: no clear owner, no public crawl permission, purely speculative SEO request, or scope larger than one domain without separate approval.
- Internal delivery estimate: 6-10 hours.
- Internal cost model: crawl/review time, manual verification, report writing, delivery walkthrough; keep private for owner pricing approval.

## Audit + Implementation

Goal: turn agreed audit findings into verified production improvements.

- Target customer: team that wants ASDEV to fix selected findings after report approval.
- Required inputs: approved audit report, agreed remediation list, repository/deploy workflow summary, staging access or collaborator workflow, rollback owner, acceptance criteria.
- Crawl and review scope: limited to findings selected from Entry or Full Audit and before/after verification on affected URLs.
- Included: implementation plan, scoped fixes, local/staging verification, before/after evidence, rollback notes, handoff summary.
- Excluded: production deployment without explicit approval, production database migration without exact approval phrase, unrelated redesign, open-ended engineering support, payment provider activation.
- Deliverable: patch/PR or agreed artifact, verification report, residual risk list.
- SLA: scoped per proposal; small remediation batch target is 3-7 business days after access and approval.
- Revisions: one fix pass for accepted scope defects.
- Support: 14 calendar days for issues directly caused by delivered changes.
- Qualification: customer can grant safe implementation access, has a rollback path, and accepts limited scope.
- Disqualification: no staging/rollback, request for production mutation without approval, or broad rebuild disguised as audit remediation.
- Internal delivery estimate: 4-24 hours depending on selected findings.
- Internal cost model: implementation hours + verification + rollback planning; keep private for owner pricing approval.

## Monthly Monitoring

Goal: retain accounts by catching regressions after the first audit or implementation.

- Target customer: site owner, agency, or product team that needs monthly evidence, not daily managed services.
- Required inputs: monitored domain, owner contact, priority URL list, accepted baseline report, notification route.
- Crawl and review scope: one domain, up to 25 priority URLs monthly, regression checks for agreed SEO/security/performance/accessibility signals.
- Included: monthly regression report, changed findings, severity changes, limited advisory note, optional small remediation allowance only if approved in proposal.
- Excluded: 24/7 incident response, uptime SLA, unlimited fixes, content publishing, production deployment without approval, paid media analytics.
- Deliverable: monthly report, status summary, next action list.
- SLA: monthly report within 3 business days of scheduled check.
- Revisions: one factual correction per report.
- Support: monthly async review thread.
- Qualification: customer has completed an Entry or Full Audit and accepts a baseline.
- Disqualification: wants emergency response, guaranteed ranking, or monitoring without a baseline.
- Internal delivery estimate: 1.5-4 hours per month.
- Internal cost model: scheduled run review + report writing + advisory; keep private for owner pricing approval.

## Proposal Guardrails

- Public website copy must not show prices until the owner approves pricing.
- Sales language must say `Request assessment`, not `Buy now`, unless payment activation is approved.
- Each proposal must include scope, exclusions, SLA, revision boundary, and approval gates.
- Findings must separate confirmed evidence from hypotheses that require deeper measurement.
