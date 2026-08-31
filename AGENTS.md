# Audit Systems — agent execution contract

Updated: 2026-08-31. Repository: `alirezasafaeigfx/auditsystems`.

## Mission and authority

Deliver a trustworthy website-checking product that an ordinary Iranian visitor can use and understand. Coordinate its appearance, language and visitor journey with `alirezasafaeigfx/alirezasafaeisystems`, while keeping data, authentication and releases independent.

Instruction order: platform/current explicit owner instructions; this file; [Audit public-experience roadmap](docs/roadmaps/AUDIT_PUBLIC_EXPERIENCE.md); [engineering guide](docs/engineering/PAIRED_PRODUCT_ENGINEERING.md); relevant existing release/security runbooks. The new roadmap selects this mission's public-experience tasks. Earlier strategy reports and automation-generated checklists are historical/supporting evidence, not additional queues or proof of completion.

Read once at startup: current main/PR/dirty state; the roadmap's next dependency-ready task; relevant engineering/source files and tests. Re-read actual deployment policy before remote operations. Label this review environment REVIEW_WORKSPACE, not an owner PC or production machine.

## Isolation and autonomy

- Use an isolated branch/worktree and preserve unknown dirty work. Never commit directly to main or force-push.
- The owner explicitly included these two repositories. Modify each only under its own bounded PR and local instructions; do not change PersianToolbox or another application.
- Keep each PR a complete reviewable outcome. Validate ancestry and every changed path against current main.
- Continue safe ready work without repeated permission questions. Missing runtime authorization blocks only its affected lane; keep preparing independent design, code and tests.
- Actual repository settings must be read before integration. Unprotected main is a gap to report, not permission to skip PRs/checks. Do not change protection/runner/server settings merely to obtain green checks.
- Only the coordinator integrates and reconciles status. Never label self-review independent.
- Do not send messages, activate monitoring, publish content, change merchant settings, or perform live submissions without authorization for that action.

## Verified architecture

Use versions from the actual lockfile and compatible project/CI runtime, not stale fixed versions in prose. Current source uses Next.js App Router, React, TypeScript strict, Prisma/PostgreSQL, custom CSS variables, pdf-lib, Cheerio and Vitest. Main brand site uses a different SQLite/Tailwind stack; do not transplant its database or CSS framework.

No global installs, automatic upstream updates, new paid services, framework/auth/database migration or blanket dependency upgrades. A scoped security dependency repair needs its own compatibility review and tests. Project scripts referencing a parent workspace are not guaranteed to exist in a standalone checkout.

Production identity, host, ports and deployed SHA must come from governed current release evidence. Historical release IDs and example shell commands are not authorization to deploy, migrate, restart or replace a symlink. Preserve existing app isolation and use approved release/rollback runbooks. Never use a global PM2 update/restart that affects other applications.

## Project-local skills

Run `bash scripts/agent-skills.sh verify` before relying on local skill sources. If pinned submodules are missing, use the existing `sync` command; never use floating tags/global installers. Keep gitlinks and `skills-lock.json` synchronized in a dedicated PR. Pinned vendor sources remain read-only.

For creative/behavior changes, use the applicable Superpowers process; for UI/UX, then read `.codex/skills/ui-ux-pro-max/SKILL.md`. Marketing tasks additionally use `.agents/product-marketing.md` and `.agents/skills/auditsystems-marketing/SKILL.md`. Skill guidance cannot grant production, payment, outreach, secret or permission changes. Do not assume an unavailable plugin/agent/model exists.

## Product and language rules

- Explain what is checked, what the visitor receives, what is not checked and the next action.
- Distinguish automated checking, specialist assessment and implementation help. One form owner per intent; no duplicate forms presented as the same service.
- Public Persian is natural, respectful and understandable without programming knowledge. Optional technical details may retain precise terms.
- Translate validation, network errors, empty/loading/success states and report statuses as well as headings. EN must preserve language through form and return links.
- Never use static uptime numbers, absolute security promises, guaranteed times or fictional findings as real proof.
- Unknown/unmeasured does not mean passed or 100/100. Report, comparison and PDF must agree on coverage, findings and scoring policy.
- Motion communicates real state. No fake progress, scroll hijacking, ambient rendering, or mandatory graphics before a result/action.
- Use existing CSS variables for colors, spacing, focus and motion. Glass, gradients and card layouts are optional tools, not compulsory designs for every section.

## Security and data boundaries

Treat access control, safe fetching, consent and truthful reporting as product requirements. Apply one consistent authorization policy across HTML, JSON, comparison and export surfaces. Never expose report tokens, credentials, emails, target URLs or customer findings in cross-domain queries or evidence uploads.

Preserve SSRF protections, public DNS validation and IP pinning across redirects; do not replace the safe fetcher for convenience. Do not weaken rate limits, CSRF, secure cookies, payment verification or signed downloads during UI work.

Tests use disposable/mock data. Never aim fixture-writing or audit-creation suites at Production. Public read-only health/route checks do not prove worker, payment, email, authorization or rollback behavior.

## Verification and honest reporting

For behavior changes: reproduce with a focused failing test, implement the smallest complete outcome, run focused tests, then lint/typecheck/full relevant suite/build. Inspect actual routes and states; screenshot presence and source-string assertions are insufficient. Record real runtime/package-manager versions and deviations.

Existing project checks remain required where applicable:
`pnpm check:no-database-dumps`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm scan:secrets`, `pnpm check:actions-pinned`, pinned-skill integrity checks and governed route/readiness checks. Inspect scripts before running them; several automation commands may call live services. Run only safe portions in disposable environments and report the remainder honestly.

Docs-only changes need complete diff/link/source-reference/consistency/secret checks and independent document review. Local app tests are not required merely for prose; actual required hosted checks are not waived.

For every claimed task report:
- base, candidate, merge and actual deployed SHAs separately;
- implementation, UI/motion, plain copy, accessibility, performance, security/truth and release verdicts separately;
- commands/exits/pass/fail/skip counts, artifact URLs/hashes and test environment;
- independent reviewer identity/scope/disposition and owner visual disposition when applicable;
- precise gaps and next ready action.

Use PASS, PARTIAL, FAIL, UNVERIFIED or justified NOT_APPLICABLE. DONE requires all applicable criteria. Green CI, HTTP 200, an old roadmap checkbox or a retained release directory cannot substitute for acceptance or tested rollback. Never hide errors, relax budgets, invent review/evidence/customer outcomes, or claim the other product is complete from this one's checks.
