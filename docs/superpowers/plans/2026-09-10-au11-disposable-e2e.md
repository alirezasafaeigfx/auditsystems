# AU-11 Disposable End-to-End Audit Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an ephemeral PostgreSQL acceptance test that exercises the real audit submission, queue, worker, persistence, protected report, and PDF chain.

**Architecture:** Move the existing single-lease processing behavior from the worker entrypoint into an exported module, keeping the daemon loop as an orchestration shell. An opt-in integration test starts a test-only local HTTP fixture, submits to the real route, runs worker cycles, and checks persisted and delivered results. A workflow provisions PostgreSQL and invokes that test.

**Tech Stack:** Next.js route handlers, Prisma 6, PostgreSQL 16 service, Vitest 4, Node 20.20.2 locally and pinned Actions runners.

**Spec:** `docs/superpowers/specs/2026-09-10-au11-disposable-e2e-design.md`

## Global Constraints

- Use only `NODE_ENV=test`, `AUDIT_ALLOW_LOCAL_FIXTURE=true`, synthetic secrets, and loopback fixture content.
- Preserve AU-01 credential and cache semantics and AU-02 partial/unavailable semantics.
- Do not alter Prisma schema, dependencies, lockfile, deployment, DNS, infrastructure, or scoring policy.
- The integration suite must remain skipped unless its explicit PostgreSQL environment flag is set.

---

### Task 1: Extract one real worker cycle

**Files:**
- Create: `src/worker/worker-cycle.ts`
- Modify: `src/worker/index.ts`
- Test: `src/worker/worker-cycle.postgres.test.ts`

**Interfaces:**
- Consumes: `leaseNextJob`, `markJobSucceeded`, `markJobFailed`, `heartbeatJobLease`, `handlers`.
- Produces: `runWorkerCycle({ workerId, fallbackTimeoutMs, concurrency? }): Promise<number>` returning the count of leases processed.

- [ ] **Step 1: Write the failing PostgreSQL test**

```ts
expect(await runWorkerCycle({ workerId: "au11-worker", fallbackTimeoutMs: 5_000 })).toBe(1);
expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("SUCCEEDED");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run src/worker/worker-cycle.postgres.test.ts --no-file-parallelism`

Expected: the test cannot import `runWorkerCycle` before the module exists.

- [ ] **Step 3: Move the existing lease lifecycle without changing its ownership, heartbeat, timeout, or terminal-failure rules**

```ts
export async function runWorkerCycle(options: WorkerCycleOptions): Promise<number> {
  const leases = await leaseAvailableJobs(options);
  await Promise.all(leases.map(processLease));
  return leases.length;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm exec vitest run src/worker/worker-cycle.postgres.test.ts --no-file-parallelism`

Expected: lease completion is persisted by the real queue code.

### Task 2: Add the AU-11 transactional integration matrix

**Files:**
- Create: `src/worker/au11-audit-flow.postgres.test.ts`
- Modify: `src/worker/worker-cycle.ts` only if testability exposes a real lifecycle boundary.

**Interfaces:**
- Consumes: real `POST`, `runWorkerCycle`, Prisma rows, report/API/PDF handlers, `createReportAccessCredential`.
- Produces: acceptance evidence for success/partial, duplicate idempotency, retry/terminal failure, and protected delivery.

- [ ] **Step 1: Write failing tests for actual submission-to-delivery behavior**

```ts
expect(submitted.status).toBe(200);
expect(await runWorkerCycle(worker)).toBe(1);
expect(persisted.status).toBe("SUCCEEDED");
expect(result.coverage.ratio).toBeLessThan(1);
expect(unauthorized.status).toBe(404);
expect(authorized.status).toBe(200);
```

- [ ] **Step 2: Run the focused suite and verify RED**

Run: `pnpm exec vitest run src/worker/au11-audit-flow.postgres.test.ts --no-file-parallelism`

Expected: it fails before the single-cycle worker interface exists.

- [ ] **Step 3: Implement only fixture and assertion helpers needed to call production interfaces**

```ts
vi.stubEnv("AUDIT_ALLOW_LOCAL_FIXTURE", "true");
const cycleCount = await runWorkerCycle({ workerId: "au11", fallbackTimeoutMs: 5_000 });
```

- [ ] **Step 4: Run the focused suite and verify GREEN**

Run: `pnpm exec vitest run src/worker/au11-audit-flow.postgres.test.ts --no-file-parallelism`

Expected: all required lifecycle cases pass using ephemeral PostgreSQL.

### Task 3: Make the integration required in hosted CI

**Files:**
- Create: `.github/workflows/au11-audit-flow-postgres.yml`
- Modify: `docs/reports/project-audit/2026-07-24/AUDIT_LEDGER.md`

**Interfaces:**
- Consumes: workflow service PostgreSQL, `pnpm exec prisma migrate deploy`, AU-11 test gate.
- Produces: exact-SHA hosted run evidence.

- [ ] **Step 1: Write the workflow test command with a PostgreSQL service and synthetic-only environment**

```yaml
run: pnpm exec vitest run src/worker/au11-audit-flow.postgres.test.ts --no-file-parallelism
```

- [ ] **Step 2: Run workflow syntax/pinned-action validation**

Run: `pnpm run check:actions-pinned`

Expected: PASS.

- [ ] **Step 3: Update the factual ledger only after local and hosted evidence exists**

```md
| AU-11 | CANDIDATE | exact test matrix and hosted run URL |
```

- [ ] **Step 4: Run the focused workflow and full required gate**

Run: `pnpm check && pnpm run scan:secrets && pnpm run check:actions-pinned`

Expected: all applicable repository gates pass; the known Issue #15 audit remains separately failing.
