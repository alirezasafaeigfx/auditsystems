# YC-Ready Product Roadmap — AuditSystems + AlirezaSafaeiSystems

Status: planning document for agent execution  
Primary repo: `alirezasafaei-dev/auditsystems`  
Related repo: `alirezasafaei-dev/alirezasafaeisystems`  
Goal: turn the existing audit tool + brand site into a YC-ready, self-serve SaaS product.

---

## 0. Product Thesis

AuditSystems should become a self-serve website intelligence SaaS for small businesses, agencies, and website owners who need a simple, actionable, Persian/English technical audit of their website.

The current system already has a meaningful foundation: audit runs, worker processing, report sharing, order/payment flow, PDF delivery, landing pages, pricing pages, and growth assets. The missing layer is the SaaS layer: accounts, organizations, projects, subscriptions, usage limits, retention loops, and a sharp activation path.

### Final product loop

```txt
Visitor lands on alirezasafaeisystems.ir
→ clicks free audit CTA
→ enters website URL
→ receives fast free report preview
→ signs up to save report history / unlock full PDF
→ adds website as a project
→ chooses plan
→ receives scheduled audits and alerts
→ upgrades for agency/white-label/service support
```

---

## 1. YC-Ready Definition

This product is YC-ready when it has:

1. A clear ICP.
2. A live demo that works end-to-end.
3. A self-serve activation flow.
4. A credible monetization path.
5. Real usage tracking.
6. A small but clear retention loop.
7. A product narrative that can be explained in one sentence.
8. A technical foundation that can survive early users without manual babysitting.

### One-sentence product narrative

> AuditSystems is a self-serve website audit SaaS that helps businesses and agencies find SEO, performance, security, and accessibility problems and turn them into prioritized action plans and client-ready reports.

---

## 2. Product Positioning

### Primary ICP

Small web agencies, freelancers, and business owners in Iran / Persian-speaking markets who need actionable website audits without reading complex developer tooling.

### Secondary ICP

Technical consultants and agencies who need repeatable, white-label audit reports for clients.

### Differentiation

1. Persian-first technical audit experience.
2. Simple business-readable reports.
3. Focus on SEO, performance, security, and operational readiness.
4. PDF reports that can be sent to managers or clients.
5. Local payment support.
6. Built-in upsell path from report to technical service.

---

## 3. Architecture Target

### Domains

```txt
alirezasafaeisystems.ir
  Marketing, brand, case studies, blog, credibility, inbound funnel.

audit.alirezasafaeisystems.ir
  Public audit tool, sample report, pricing, lead magnet, public reports.

app.alirezasafaeisystems.ir
  Authenticated SaaS app: dashboard, projects, reports, billing, settings.

api.alirezasafaeisystems.ir
  Future public API for agencies and integrations.
```

### Repository strategy

Do not rewrite the system.

Preferred path:

```txt
Keep auditsystems as product core.
Keep alirezasafaeisystems as marketing and trust layer.
Add app/dashboard gradually inside auditsystems or as a future app package.
Use shared packages only when duplication becomes painful.
```

---

## 4. Production Safety Rules

This project is live. Agents must follow these rules:

1. Never push directly to `main`.
2. Never deploy production unless explicitly instructed.
3. Never commit secrets, tokens, `.env`, private keys, database dumps, or production credentials.
4. Never run destructive migrations without backup + rollback plan.
5. Never replace the existing audit flow unless the new flow is behind a feature flag.
6. Keep PRs small and reviewable.
7. Every PR must include tests or a clear explanation why tests are not applicable.
8. Every database migration must include rollback notes.
9. Preserve public routes unless intentionally deprecated.
10. Prefer additive changes over rewrites.

---

## 5. Phase 0 — Baseline and Safety

### Goal

Make current production state measurable and recoverable before major SaaS changes.

### Tasks

- Add or update `docs/PRODUCTION_BASELINE.md`.
- Add or update `docs/ROLLBACK_PLAN.md`.
- Add or update `docs/DEPLOYMENT_CHECKLIST.md`.
- Verify current commands:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run roadmap:run
pnpm run payment:preflight:strict
```

- Ensure staging environment is documented.
- Ensure database backup and restore process is documented.
- Ensure rate limiting and SSRF guard are production-strict.

### Done when

- A new developer/agent can understand how production is deployed.
- Rollback is documented.
- Current checks pass or failures are documented with owners.

---

## 6. Phase 1 — SaaS Data Model

### Goal

Add account-based product primitives without breaking the public audit tool.

### Add models

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  passwordHash    String?
  emailVerifiedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Membership {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  role           String
  createdAt      DateTime @default(now())
}

model Project {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  domain         String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### Connect existing product data

- Add optional `projectId` and `organizationId` to `AuditRun`.
- Keep public audit runs working without login.
- Authenticated runs should attach to a project.

### Done when

- Users, organizations, memberships, and projects exist.
- Public audit runs still work.
- Authenticated audit runs can be linked to projects.
- Migrations are safe and tested.

---

## 7. Phase 2 — Authentication and Workspace Shell

### Goal

Allow users to create accounts and enter a dashboard.

### Routes

```txt
/signup
/login
/logout
/forgot-password
/reset-password
/verify-email
/app
/app/projects
/app/settings
```

### Requirements

- Secure httpOnly cookies.
- Password hashing.
- Email normalization.
- Session expiration.
- Organization switcher.
- Basic RBAC helpers.
- No public indexing for authenticated routes.

### Done when

A user can sign up, log in, create an organization, create a project, and see an empty dashboard.

---

## 8. Phase 3 — Dashboard MVP

### Goal

Make the product useful after login.

### Pages

```txt
/app
/app/projects
/app/projects/new
/app/projects/[projectId]
/app/projects/[projectId]/audits
/app/projects/[projectId]/audits/[runId]
/app/reports
```

### Features

- Project CRUD.
- Start audit from dashboard.
- Audit status polling.
- Audit history.
- Findings table.
- Severity filtering.
- Category filtering.
- Report detail view.
- Link existing report share to authenticated account.

### Done when

A logged-in user can add a website, run an audit, view the report, and return later to see history.

---

## 9. Phase 4 — Billing and Usage Limits

### Goal

Move from one-off payment to SaaS monetization.

### Models

```prisma
model Plan {
  id                 String  @id @default(cuid())
  code               String  @unique
  name               String
  priceMonthlyToman  Int
  auditLimitMonthly  Int
  projectLimit       Int
  hasPdfExport       Boolean @default(false)
  hasScheduledAudits Boolean @default(false)
  hasWhiteLabel      Boolean @default(false)
}

model Subscription {
  id                 String   @id @default(cuid())
  organizationId     String
  planId             String
  status             String
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model UsageLedger {
  id             String   @id @default(cuid())
  organizationId String
  type           String
  quantity       Int
  createdAt      DateTime @default(now())
}

model Invoice {
  id             String   @id @default(cuid())
  organizationId String
  amountToman    Int
  status         String
  createdAt      DateTime @default(now())
}
```

### Initial plans

```txt
Free
- 1 project
- 3 audits/month
- limited report
- no PDF

Starter
- 3 projects
- 20 audits/month
- full report
- PDF export

Pro
- 10 projects
- 100 audits/month
- scheduled audits
- email alerts
- comparison history

Agency
- 50 projects
- white-label PDF
- team members
- client-ready reports
```

### Done when

- A user can select a plan.
- Payment activates a subscription.
- Usage limits block excessive audit runs.
- Billing page shows current plan and invoices.

---

## 10. Phase 5 — Retention Loop

### Goal

Give users a reason to keep paying monthly.

### Features

- Scheduled audits.
- Weekly or monthly audit frequency.
- Email alerts for critical issues.
- Trend history.
- Score comparison over time.
- Report comparison between two runs.

### Model

```prisma
model ScheduledAudit {
  id        String   @id @default(cuid())
  projectId String
  frequency String
  enabled   Boolean  @default(true)
  nextRunAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Done when

A paid user can enable scheduled audits and receive alerts when issues are detected.

---

## 11. Phase 6 — Report Quality and White Label

### Goal

Make reports good enough for agencies and managers.

### Features

- PDF v2.
- Executive summary.
- Priority matrix.
- Action plan.
- Persian and English report output.
- Agency white-label mode.
- Secure report sharing.
- Expiring public links.

### Done when

A report can be sent directly to a client or manager without additional editing.

---

## 12. Phase 7 — Growth and YC Metrics

### Goal

Track and improve activation, conversion, and retention.

### Events

```txt
landing_viewed
audit_started
audit_completed
report_viewed
signup_started
signup_completed
project_created
checkout_started
payment_succeeded
scheduled_audit_enabled
pdf_downloaded
upgrade_clicked
```

### Key metrics

```txt
Visitor → audit_started
Audit started → report_viewed
Report viewed → signup_completed
Signup completed → project_created
Project created → paid conversion
Paid conversion → scheduled audit enabled
Week 4 retention
MRR
```

### Done when

The dashboard or analytics data can answer: where do users drop off and what creates revenue?

---

## 13. Phase 8 — Productized Services

### Goal

Use reports as a sales engine for services and higher-tier plans.

### Service offers

```txt
Fix My SEO
Speed Optimization
Security Hardening
Technical Audit Call
WordPress Performance Package
E-commerce Audit Package
```

### Done when

Every serious finding has a relevant CTA to upgrade, book a call, or buy a service package.

---

## 14. Phase 9 — Agency API

### Goal

Create a higher-value product for agencies and technical teams.

### Features

- API keys.
- API usage limits.
- Webhooks.
- Developer docs.
- Agency project grouping.

### API v1

```txt
POST /v1/projects
GET /v1/projects
POST /v1/audits
GET /v1/audits/:id
GET /v1/reports/:id
```

### Webhooks

```txt
audit.completed
audit.failed
critical_issue.detected
subscription.updated
```

### Done when

An agency can trigger audits and receive completed report events from their own system.

---

## 15. Phase 10 — YC Demo Readiness

### Goal

Prepare a product demo and founder narrative.

### Demo script

```txt
1. Open landing page.
2. Enter a website URL.
3. Show free report preview.
4. Sign up to save report.
5. Add the website as a project.
6. Show dashboard history.
7. Show critical findings.
8. Click export PDF.
9. Hit usage limit or upgrade CTA.
10. Show billing plan.
11. Enable scheduled audits.
```

### YC product proof

- The demo works.
- The product has real user flow.
- The product can charge money.
- The product has retention logic.
- The product has a niche wedge.
- The product has a credible path to agencies and APIs.

### Done when

A 3-minute demo can show the entire loop without manual database edits or fake screens.

---

## 16. Global Definition of Done

Every agent PR must satisfy:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

If available:

```bash
pnpm run roadmap:run
pnpm run payment:preflight:strict
pnpm run smoke:audit-flow
```

Each PR must include:

```txt
Summary
Files changed
Risk level
Testing performed
Rollback notes
Migration notes, if any
Screenshots, if UI changed
```

---

## 17. Anti-Goals

Do not prioritize these before SaaS core is working:

```txt
Mobile app
AI/ML insights
Large rewrite
Complex enterprise SSO
Full public API
Multiple payment providers beyond the currently needed one
Overdesigned design system
Premature microservices
```

---

## 18. Immediate Next Sprint

The next sprint should be:

```txt
Sprint: SaaS Foundation MVP

1. Add User, Organization, Membership, Project models.
2. Add optional projectId/organizationId to AuditRun.
3. Add auth routes.
4. Add dashboard shell.
5. Add project creation.
6. Allow logged-in users to start an audit for a project.
7. Show audit history for that project.
8. Add basic usage counter for Free plan.
9. Keep public audit flow working.
10. Create PR with tests and rollback notes.
```

Expected result: the product becomes account-based while preserving the existing public audit tool.
