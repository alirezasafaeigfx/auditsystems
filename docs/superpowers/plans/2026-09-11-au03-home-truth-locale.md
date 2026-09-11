# AU-03 Home Truth And Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Audit home entry truthful and bilingual, with one clear automated action and a distinct specialist-review action, while preserving existing audit/security/scoring contracts.

**Architecture:** Keep the existing Home pages, custom CSS, CTA registry, qualification flow, and audit entry. Make `HeroAuditForm` locale-aware through a small typed copy map and locale-preserving audit target. Simplify each Hero around the form as the automated primary action, one internal specialist-review CTA to the existing qualification flow, and a sample-report CTA. Remove unsupported reliability/security/time/privacy claims rather than replacing them with new numeric claims.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Vitest, React DOM server rendering, existing custom CSS/CTA registry.

**Spec:** Approved AU-03 card in PR #1 `docs/roadmaps/AUDIT_PUBLIC_EXPERIENCE.md`, current owner mission instructions, and `docs/engineering/PAIRED_PRODUCT_ENGINEERING.md` from the reviewed paired-docs candidate.

## Global Constraints

- Base every code change on current `main` SHA `34851d90f425d7ea87bad48aff5c7f5909677da1`; do not use PR #1 as code ancestry.
- Keep AU-01 access, AU-02 scoring/coverage, and AU-11 processing behavior unchanged.
- No framework, database, authentication, payment, dependency, lockfile, Production/staging, or infrastructure mutation.
- Specialist review stays inside Audit qualification for AU-03. ASDEV implementation routing is AU-04 and must use a verified paired route later.
- Persian and English must preserve equivalent meaning; URL input remains readable in RTL by using LTR direction for the value.
- Unsupported uptime, complete-security, fixed-duration, private-data, production-infrastructure, and historical automation-count claims are removed rather than softened into unverifiable claims.

---

### Task 1: Prove the bilingual Home-entry gap

**Files:**
- Create: `src/components/HeroAuditForm.test.ts`
- Create: `src/app/home-experience.test.ts`

**Interfaces:**
- Consumes: current `HeroAuditForm`, `src/app/page.tsx`, and `src/app/en/page.tsx`.
- Produces: regression contracts for locale-aware form copy/target semantics, truthful Home copy, and distinct Hero actions.

- [ ] **Step 1: Write failing locale and Home-experience tests**

Render the component/pages with `react-dom/server`. Require English form copy on `/en`, an LTR URL field, locale-preserving audit destination semantics, no unsupported claim strings, and a distinct specialist-review link instead of duplicate request buttons.

- [ ] **Step 2: Run focused tests and confirm RED for the intended missing behavior**

Run: `pnpm exec vitest run src/components/HeroAuditForm.test.ts src/app/home-experience.test.ts`

Expected on the pre-fix source: FAIL because `HeroAuditForm` has no locale contract, the English Home renders Persian form copy, and unsupported/duplicate Home claims remain.

### Task 2: Implement the smallest complete truthful bilingual entry

**Files:**
- Modify: `src/components/HeroAuditForm.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/en/page.tsx`
- Modify only if required by tests: `src/lib/audit-cta-registry.ts`

**Interfaces:**
- Consumes: `locale: "fa" | "en"` and existing `/audit`, `/en/audit`, `/qualification`, `/en/qualification`, and `/sample-report` routes.
- Produces: locale-aware form UI; form submission targets `/audit` or `/en/audit`; specialist CTA targets the existing localized qualification flow; no new external payload.

- [ ] **Step 1: Add a typed `locale` prop/copy map to `HeroAuditForm`**

Use English/Persian accessible names, validation text, placeholder, button and hint. Keep the entered public URL value LTR. Default to `fa` only for backward compatibility, while both Home pages pass locale explicitly.

- [ ] **Step 2: Preserve locale in automated audit navigation**

Build the destination from the validated URL as `/audit?url=...` for FA and `/en/audit?url=...` for EN. Do not add tracking parameters or sensitive data beyond the target URL already used by the existing audit flow.

- [ ] **Step 3: Simplify the FA/EN Heroes and remove unsupported claims**

The form submit is the primary automated action. Add one visibly secondary specialist-review action to localized qualification and retain a sample-report action. Remove duplicate request/pricing Hero CTAs and unsupported uptime/security/fixed-time/private-data/infrastructure/internal-count copy. Keep limits explicit: reports cover checks that actually ran and may have unavailable/unmeasured areas.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `pnpm exec vitest run src/components/HeroAuditForm.test.ts src/app/home-experience.test.ts`

Expected: PASS with zero failures.

- [ ] **Step 5: Mutation-check the effective fix**

Temporarily restore one effective defect (English form locale or an unsupported Home claim), rerun the focused regression and confirm FAIL, then restore the correction and rerun to PASS. Record the exact witness in the PR/ledger evidence.

### Task 3: Verify the repository candidate

**Files:**
- No product files beyond Task 2.
- Update the mission ledger only if it exists on current main; otherwise record the exact ledger-unavailable blocker in the PR because importing the stale unmerged PR #1 ledger would create unsafe ancestry.

**Interfaces:**
- Produces: exact final SHA and hosted verification evidence.

- [ ] **Step 1: Run project-local skill/integrity gates**

Run the existing repository commands without changing dependency versions or lockfile.

- [ ] **Step 2: Run focused tests, full Vitest, lint, typecheck, build, secret/action/database guards and smoke routes**

Use repository-declared scripts and report exact exits/counts/skips. Treat missing browsers/network/PostgreSQL separately from application failures.

- [ ] **Step 3: Inspect the complete base-to-head diff**

Require only the plan/tests/Home/form changes and any strictly necessary registry adjustment.

- [ ] **Step 4: Request independent review on the exact final SHA and run current hosted checks**

A self-review is not independent. If no separate reviewer is available, record that evidence gap precisely instead of fabricating approval.

- [ ] **Step 5: Merge only when actual policy/check/review state permits**

Record base/head/merge/current-main separately. Do not deploy or infer deployed SHA from the merge.
