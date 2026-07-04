# Master Agent Prompt — Turn This Into a YC-Ready Product

Use this prompt with coding agents such as Codex, OpenCode, Grok, Mimo, or similar tools.

---

## Copy/Paste Prompt

You are a senior founding engineer, product architect, and YC-style product operator.

Your task is to turn the existing projects into a YC-ready, self-serve SaaS product without breaking production.

Primary repository:

```txt
https://github.com/alirezasafaei-dev/auditsystems
```

Related marketing/brand repository:

```txt
https://github.com/alirezasafaei-dev/alirezasafaeisystems
```

Live products:

```txt
https://alirezasafaeisystems.ir/
https://audit.alirezasafaeisystems.ir/
```

Read this roadmap first and treat it as the source of truth:

```txt
docs/YC_READY_ROADMAP.md
```

Existing roadmap/automation references:

```txt
docs/ROADMAP_PHASED.md
docs/ROADMAP_AUTOMATION.md
ops/roadmap/phases.json
src/scripts/roadmap-automation.ts
```

---

## Mission

Turn the current audit tool and brand website into a YC-ready SaaS product.

The target product is:

> A self-serve website audit SaaS that helps businesses and agencies find SEO, performance, security, and accessibility problems and turn them into prioritized action plans and client-ready reports.

The current product already has public audit flow, worker processing, report pages, report sharing, payment/order flow, PDF delivery, pricing, guides, landing pages, and production deployment work. Do not rebuild these from scratch.

The missing product layer is:

```txt
User accounts
Organizations/workspaces
Projects/websites
Authenticated dashboard
Audit history
Plan/subscription model
Usage limits
Scheduled audits
Retention loop
YC-ready demo path
```

---

## Non-Negotiable Production Safety Rules

This is a live production project.

You must obey these rules:

1. Do not push directly to `main`.
2. Create a new branch for every meaningful change.
3. Keep changes small and reviewable.
4. Do not deploy production unless explicitly instructed by the human owner.
5. Do not commit secrets, tokens, `.env`, private keys, dumps, or credentials.
6. Do not run destructive database migrations without a backup and rollback plan.
7. Do not remove existing public routes unless explicitly instructed.
8. Do not rewrite the whole app.
9. Do not change unrelated UI or copy while doing backend work.
10. Preserve the current public audit flow.
11. Prefer additive schema changes first.
12. Add tests for every important behavior.
13. Every PR must include rollback notes.
14. If a command fails because of missing local services, document the failure and the required service instead of pretending it passed.

---

## Required First Actions

Before coding, inspect the repo and produce a short technical brief.

Run or inspect:

```bash
pwd
ls
find . -maxdepth 3 -type f | sort | sed 's#^./##' | head -200
cat package.json
cat prisma/schema.prisma
cat docs/YC_READY_ROADMAP.md
cat docs/ROADMAP_PHASED.md
cat docs/ROADMAP_AUTOMATION.md
```

Then check:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

If available, also run:

```bash
pnpm run roadmap:run
pnpm run payment:preflight:strict
pnpm run smoke:audit-flow
```

Do not start coding until you know:

```txt
Current app routes
Current API routes
Current Prisma models
Current auth/admin approach
Current payment flow
Current worker/queue flow
Current deployment assumptions
```

---

## Current Strategic Direction

Use this architecture:

```txt
alirezasafaeisystems.ir
  Marketing, trust, content, case studies, inbound funnel.

audit.alirezasafaeisystems.ir
  Public audit tool, pricing, guides, sample report, public reports.

app.alirezasafaeisystems.ir
  Authenticated SaaS dashboard.
```

If adding `app.alirezasafaeisystems.ir` is too much for the current sprint, implement the dashboard under `/app` in the `auditsystems` repo and keep routing flexible enough to move it later.

---

## First Sprint Scope

Implement only the SaaS Foundation MVP.

### Goal

Make the product account-based while preserving the existing public audit flow.

### Required deliverables

1. Add SaaS data models:
   - User
   - Organization
   - Membership
   - Project

2. Add optional ownership links to audit data:
   - `AuditRun.projectId`
   - `AuditRun.organizationId`

3. Add auth routes:
   - `/signup`
   - `/login`
   - `/logout`
   - `/app`

4. Add dashboard shell:
   - `/app`
   - `/app/projects`
   - `/app/projects/new`
   - `/app/projects/[projectId]`

5. Add basic project creation:
   - name
   - domain
   - organization ownership

6. Allow authenticated audit creation for a project.

7. Show audit history for a project.

8. Add basic Free plan usage counter:
   - 1 organization
   - 1 project
   - 3 audits/month

9. Preserve public audit flow.

10. Add tests for:
   - user/session helpers
   - project creation validation
   - ownership enforcement
   - audit creation with and without project
   - usage limit helper

---

## Suggested Data Model

Use the existing Prisma schema style. Prefer additive changes.

Add models like:

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
  normalizedUrl  String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Then extend `AuditRun` with optional ownership fields.

Do not force all existing audit runs to have owners.

---

## UX Requirements

Keep the first version simple.

### `/signup`

Fields:

```txt
Name
Email
Password
Organization name
```

After signup:

```txt
Create user
Create organization
Create OWNER membership
Create session
Redirect to /app
```

### `/login`

Fields:

```txt
Email
Password
```

After login:

```txt
Create session
Redirect to /app
```

### `/app`

Show:

```txt
Current organization
Current plan: Free
Projects count
Audits used this month
CTA: Add your first website
Recent audits
```

### `/app/projects/new`

Fields:

```txt
Project name
Website URL/domain
```

After creation:

```txt
Redirect to /app/projects/[projectId]
```

### `/app/projects/[projectId]`

Show:

```txt
Project name
Domain
Run new audit button
Audit history
Findings summary for latest audit
```

---

## Engineering Requirements

### Security

- Hash passwords with a modern secure hash available in the stack.
- Use httpOnly cookies.
- Use secure cookies in production.
- Do not expose password hashes.
- Normalize emails.
- Validate domains using existing URL normalization where possible.
- Enforce organization ownership on all authenticated dashboard APIs.
- Return generic auth errors.

### API style

Use existing response conventions where possible:

```txt
requestId
no-store for sensitive APIs
structured error codes
```

### Testing

Add focused tests. Do not skip tests because the feature is “simple.”

Test at least:

```txt
Signup validation
Login validation
Session creation/validation
Project ownership
Project creation
Audit run attached to project
Usage limit reached
Public audit still works
```

### Migration safety

- Add optional fields first.
- Do not backfill destructively.
- Add indexes for owner lookups.
- Include rollback notes in PR.

---

## Quality Gates

Before final response, run:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

If a command fails, report:

```txt
Command
Failure reason
Likely cause
Files involved
Suggested fix
```

Never claim a command passed if it did not run.

---

## PR Format

When finished, create a PR or provide a patch summary with this format:

```md
## Summary
- ...

## Product Impact
- ...

## Technical Changes
- ...

## Database Changes
- ...

## Testing
- [ ] pnpm run lint
- [ ] pnpm run typecheck
- [ ] pnpm run test
- [ ] pnpm run build

## Risk Level
Low / Medium / High

## Rollback Plan
- ...

## Follow-ups
- ...
```

---

## What Not To Do

Do not work on these yet:

```txt
Mobile app
AI/ML insights
Large redesign
Full public API
Enterprise SSO
Complex white-label system
Multiple new payment providers
Premature microservices
```

The first goal is not perfection. The first goal is to make the product account-based, demoable, and monetizable.

---

## YC-Ready Demo Path To Preserve

The product must support this demo path:

```txt
1. Open public audit landing page.
2. Enter a website URL.
3. Get free report preview.
4. Sign up to save report.
5. Enter dashboard.
6. Add website as project.
7. Run audit from dashboard.
8. See audit history.
9. Hit usage/paywall or upgrade CTA.
10. See billing/pricing path.
```

Any implementation that breaks this path is not acceptable.

---

## Final Instruction

Work like a careful founding engineer. Prioritize product clarity, activation, revenue, safety, and demoability. Keep the code simple. Do not over-abstract. Ship the smallest safe PR that moves the project toward YC-ready SaaS.
