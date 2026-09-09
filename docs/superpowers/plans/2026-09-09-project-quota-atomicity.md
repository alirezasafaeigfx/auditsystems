# Atomic Project Quota Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent concurrent authenticated project-creation requests from exceeding an organization's plan limit, return actionable quota metadata, and present an accessible upgrade path without clearing the submitted form.

**Architecture:** Move the authoritative count-and-create decision into a reusable Prisma serializable transaction with bounded `P2034` retries. Keep authentication, CSRF, input validation, URL normalization, and plan lookup at the route boundary. Return a stable typed quota response to the client, where a small parser and focused notice component handle the upgrade experience.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Prisma 6, Vitest 4, PostgreSQL integration workflow.

**Global Constraints:** No schema migration. Do not change the public acquisition endpoint. Do not weaken existing rate limits, auth, CSRF, or plan rules. Use the project logger/observability helpers, never `console.*`. Preserve controlled form values after all failures. Keep all changes within the AuditSystems feature branch and require the full repository gate before sync.

---

## Task 1: Add the atomic project-creation domain helper

**Files:**
- Create: `src/lib/project-create.ts`
- Create: `src/lib/project-create.test.ts`
- Reference: `src/lib/audit-enqueue.ts`
- Reference: `src/lib/audit-enqueue.test.ts`

- [ ] **Step 1: Write failing tests for the domain contract**

Cover these cases with a hoisted Prisma transaction mock:

1. Reject a non-positive, non-finite, or non-integer `projectLimit` with `INVALID_PROJECT_LIMIT` before starting a transaction.
2. Execute count and create in a transaction configured with `Prisma.TransactionIsolationLevel.Serializable`.
3. Return the created project when `current < projectLimit`.
4. Throw `PROJECT_LIMIT_REACHED` with exact `current` and `limit` when `current >= projectLimit`, and do not call `create`.
5. Retry a `PrismaClientKnownRequestError` with code `P2034` up to three total attempts.
6. Convert a third `P2034` failure into `PROJECT_CREATE_RETRY_EXHAUSTED`.
7. Re-throw unrelated Prisma/application errors unchanged.

Use this public contract in the test:

```ts
export type AtomicProjectCreateInput = {
  organizationId: string;
  name: string;
  domain: string;
  normalizedUrl: string;
  projectLimit: number;
};

export type ProjectCreateErrorCode =
  | "INVALID_PROJECT_LIMIT"
  | "PROJECT_LIMIT_REACHED"
  | "PROJECT_CREATE_RETRY_EXHAUSTED";

export class ProjectCreateError extends Error {
  readonly code: ProjectCreateErrorCode;
  readonly current?: number;
  readonly limit?: number;
}

export async function createProjectAtomically(
  input: AtomicProjectCreateInput
): Promise<Project>;
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm exec vitest run src/lib/project-create.test.ts
```

Expected: FAIL because `src/lib/project-create.ts` does not exist.

- [ ] **Step 3: Implement the minimum serializable transaction**

Implement the same bounded-retry shape already established in `audit-enqueue.ts`:

```ts
const MAX_TRANSACTION_ATTEMPTS = 3;

async function createInTransaction(
  tx: Prisma.TransactionClient,
  input: AtomicProjectCreateInput
) {
  const current = await tx.project.count({
    where: { organizationId: input.organizationId }
  });

  if (current >= input.projectLimit) {
    throw new ProjectCreateError("PROJECT_LIMIT_REACHED", {
      current,
      limit: input.projectLimit
    });
  }

  return tx.project.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      domain: input.domain,
      normalizedUrl: input.normalizedUrl
    }
  });
}
```

Call it through:

```ts
prisma.$transaction(
  (tx) => createInTransaction(tx, input),
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
);
```

Only retry `P2034`; after the third conflict throw `PROJECT_CREATE_RETRY_EXHAUSTED`. Do not log inside the domain helper because the route owns request context and observability.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run:

```bash
pnpm exec vitest run src/lib/project-create.test.ts
```

Expected: PASS with all seven behaviors covered.

- [ ] **Step 5: Commit the domain slice**

```bash
git add src/lib/project-create.ts src/lib/project-create.test.ts
git commit -m "fix(projects): enforce quota atomically"
```

## Task 2: Prove concurrency against PostgreSQL and wire CI

**Files:**
- Create: `src/lib/project-create.postgres.test.ts`
- Modify: `.github/workflows/atomic-enqueue-postgres.yml`
- Reference: `src/lib/audit-enqueue.postgres.test.ts`

- [ ] **Step 1: Add a real PostgreSQL concurrency test**

Gate the suite with `PROJECT_CREATE_INTEGRATION === "true"`. Create a unique organization, ensure it has no projects, then call `createProjectAtomically` twice concurrently with `projectLimit: 1` and distinct valid project data:

```ts
const results = await Promise.allSettled([
  createProjectAtomically(firstInput),
  createProjectAtomically(secondInput)
]);
```

Assert:

- exactly one promise is fulfilled;
- exactly one promise is rejected with `ProjectCreateError.code === "PROJECT_LIMIT_REACHED"`;
- the organization has exactly one persisted project;
- cleanup removes only records created by this test.

- [ ] **Step 2: Run the test without PostgreSQL and confirm it is skipped**

Run:

```bash
pnpm exec vitest run src/lib/project-create.postgres.test.ts --no-file-parallelism
```

Expected: suite is skipped because the opt-in environment variable is absent.

- [ ] **Step 3: Extend the pinned PostgreSQL workflow**

Add the new source/test paths to the workflow path filter, add:

```yaml
PROJECT_CREATE_INTEGRATION: "true"
```

and change the focused integration command to:

```bash
pnpm exec vitest run \
  src/lib/audit-enqueue.postgres.test.ts \
  src/lib/project-create.postgres.test.ts \
  --no-file-parallelism
```

Do not change service credentials, action SHAs, migration steps, or job permissions.

- [ ] **Step 4: Validate workflow syntax and non-integration behavior**

Run:

```bash
pnpm check:actions-pinned
pnpm exec vitest run src/lib/project-create.postgres.test.ts --no-file-parallelism
```

Expected: action pin check passes; local suite remains intentionally skipped.

- [ ] **Step 5: Commit the PostgreSQL proof slice**

```bash
git add src/lib/project-create.postgres.test.ts .github/workflows/atomic-enqueue-postgres.yml
git commit -m "test(projects): cover concurrent quota enforcement"
```

## Task 3: Replace the API time-of-check/time-of-use flow

**Files:**
- Modify: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/route.test.ts`
- Reference: `src/lib/usage.ts`
- Reference: `src/lib/observability.ts`

- [ ] **Step 1: Write failing route contract tests**

Mock auth, membership, CSRF, URL normalization, `getCurrentPlan`, `createProjectAtomically`, and observability at module boundaries. Cover:

1. A valid request passes `organizationId`, trimmed `name`, normalized host/URL, and `plan.projectLimit` to the atomic helper and returns `201`.
2. `PROJECT_LIMIT_REACHED` returns `403` with:

```json
{
  "error": "PROJECT_LIMIT_REACHED",
  "usage": { "current": 1, "limit": 1 },
  "upgradeUrl": "/app/billing",
  "requestId": "request-id"
}
```

3. `PROJECT_CREATE_RETRY_EXHAUSTED` returns a safe `503` response with `Retry-After: 1`, preserving `Cache-Control: no-store`.
4. Unexpected errors return the existing `500 INTERNAL_ERROR` contract and are logged without exposing raw details to the response.
5. Existing unauthorized, CSRF, invalid JSON, invalid payload, invalid name, and invalid URL branches remain covered.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm exec vitest run src/app/api/projects/route.test.ts
```

Expected: FAIL because the route still uses `canCreateProject` and direct `prisma.project.create`.

- [ ] **Step 3: Refactor the route to the atomic boundary**

Replace the `prisma` and `canCreateProject` imports with:

```ts
import {
  createProjectAtomically,
  ProjectCreateError
} from "../../../lib/project-create";
import { getCurrentPlan } from "../../../lib/usage";
```

After input validation and URL normalization, fetch the plan and call the helper once:

```ts
const plan = await getCurrentPlan(orgId);
const project = await createProjectAtomically({
  organizationId: orgId,
  name,
  domain: normalized.host,
  normalizedUrl: normalized.normalizedUrl,
  projectLimit: plan.projectLimit
});
```

In the outer catch, translate only known `ProjectCreateError` codes. For a quota error, require defined `current` and `limit` and include the fixed relative upgrade URL. For retry exhaustion, log a warning and return a retryable `503`. Continue using `respondJson` and `logEvent`.

- [ ] **Step 4: Run route and domain tests**

Run:

```bash
pnpm exec vitest run \
  src/app/api/projects/route.test.ts \
  src/lib/project-create.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the API slice**

```bash
git add src/app/api/projects/route.ts src/app/api/projects/route.test.ts
git commit -m "fix(api): return actionable project quota errors"
```

## Task 4: Add an accessible, typed quota notice without clearing form state

**Files:**
- Create: `src/lib/project-limit-response.ts`
- Create: `src/lib/project-limit-response.test.ts`
- Create: `src/components/ProjectLimitNotice.tsx`
- Create: `src/components/ProjectLimitNotice.test.ts`
- Modify: `src/app/app/projects/new/page.tsx`

- [ ] **Step 1: Write failing parser and rendering tests**

Define this client boundary:

```ts
export type ProjectLimitResponse = {
  error: "PROJECT_LIMIT_REACHED";
  usage: { current: number; limit: number };
  upgradeUrl: string;
};

export function parseProjectLimitResponse(value: unknown): ProjectLimitResponse | null;
```

Parser tests must reject missing objects, non-finite/negative counts, `current > limit`, an empty upgrade URL, and any non-quota error. The component test must render with React's server renderer and assert:

- `role="alert"` is present;
- the exact `current / limit` usage is visible;
- an anchor points to `/app/billing`;
- Persian upgrade copy is visible.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```bash
pnpm exec vitest run \
  src/lib/project-limit-response.test.ts \
  src/components/ProjectLimitNotice.test.ts
```

Expected: FAIL because parser and component do not exist.

- [ ] **Step 3: Implement the strict response parser**

Accept only the stable API shape, integer non-negative counts with `current <= limit`, and a same-origin application path beginning with `/app/`. This prevents an API payload from becoming an open redirect/link injection source.

- [ ] **Step 4: Implement the quota notice**

Create a presentational component accepting `current`, `limit`, and `upgradeUrl`. Use `role="alert"`, visible usage text, and a normal same-origin anchor to the billing page. Follow the existing inline-style design language; do not add a new styling dependency or animation.

- [ ] **Step 5: Integrate with the controlled form**

Replace the single `error` string state with separate generic-error and quota-notice state. On each submit, clear displayed errors but do not change `name` or `url`. When the parsed quota payload is valid, render `ProjectLimitNotice`; otherwise retain the existing localized generic/security/network errors. Add `role="alert"` to the generic error container as well.

The successful path remains:

```ts
router.push(`/app/projects/${data.projectId}`);
```

- [ ] **Step 6: Run focused UI-boundary tests**

Run:

```bash
pnpm exec vitest run \
  src/lib/project-limit-response.test.ts \
  src/components/ProjectLimitNotice.test.ts \
  src/app/api/projects/route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the client slice**

```bash
git add \
  src/lib/project-limit-response.ts \
  src/lib/project-limit-response.test.ts \
  src/components/ProjectLimitNotice.tsx \
  src/components/ProjectLimitNotice.test.ts \
  src/app/app/projects/new/page.tsx
git commit -m "feat(projects): show quota usage and upgrade path"
```

## Task 5: Run complete verification and inspect the final diff

**Files:**
- Verify all files changed in Tasks 1-4
- Modify only if a gate exposes a real defect

- [ ] **Step 1: Run the mandatory repository gates**

Run in order:

```bash
bash scripts/agent-skills.sh verify
bash scripts/tests/test-agent-skills-integrity.sh
pnpm check:no-database-dumps
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm scan:secrets
pnpm check:actions-pinned
pnpm smoke:routes
```

Record exact exit status and test counts. If a gate fails, use `systematic-debugging`; fix only the root cause in this feature's scope and rerun the failed gate plus any affected earlier gate.

- [ ] **Step 2: Inspect security and regression properties**

Confirm from the diff and tests:

- no secrets or environment files were added;
- no database schema/migration changed;
- no auth, CSRF, rate-limit, or public audit endpoint behavior changed;
- no raw exception text reaches clients;
- `upgradeUrl` is fixed server-side and validated client-side;
- form input state is never reset on failure;
- all GitHub Actions remain pinned.

- [ ] **Step 3: Review the complete diff and commit any verification fix**

Run:

```bash
git diff --check github/main...HEAD
git diff --stat github/main...HEAD
git status --short --branch
```

If verification required a code change, commit it with a narrow conventional message. Expected final status before sync: clean feature branch, ahead of the exact `github/main` base, no untracked artifacts.

## Task 6: Sync the clean feature branch and produce review evidence

**Files:**
- No source changes expected

- [ ] **Step 1: Refresh and reconcile with `GITHUB_MAIN`**

```bash
git fetch github main
git rebase github/main
```

If `GITHUB_MAIN` moved, rerun at minimum `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; rerun additional affected gates when the rebase touches their inputs.

- [ ] **Step 2: Verify exact clean/sync state**

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse github/main
git rev-list --left-right --count github/main...HEAD
```

Expected: clean branch, `0 N` divergence (not behind, ahead by feature commits).

- [ ] **Step 3: Push the feature branch without mutating main**

```bash
git push -u github fix/project-quota-atomic-20260909
```

If the branch was previously pushed and a rebase changed its history, use `--force-with-lease`, never plain `--force`.

- [ ] **Step 4: Create or update one focused pull request**

The PR body must state:

- ASDEV Audit goal: lower execution/support cost and improve paid-plan reliability;
- exact before/after race behavior;
- test and build evidence;
- PostgreSQL concurrency workflow status;
- no migration and no production deployment;
- exact feature SHA and `GITHUB_MAIN` base SHA.

Do not merge or deploy without the applicable explicit approval gate.

- [ ] **Step 5: Preserve the owner's existing checkout**

Do not reset, clean, checkout, or delete anything in the dirty owner checkout at `D:\My_Projects\auditsystems`. Report its branch, SHA, behind/ahead counts, and dirty status separately from the clean WSL worktree. Remove only temporary artifacts created by this implementation after verifying they are untracked, reproducible, and no longer needed.
