# Atomic Project Quota Enforcement Design

**Date:** 2026-09-09
**Status:** Approved design, pending written-spec review
**Base:** `github/main` at `efd937427c2910aea8a31ada4e4b91ec3b0ca09d`

## Goal

Prevent authenticated organizations from exceeding their plan's project limit through concurrent direct API requests, and give clients enough structured information to present the current usage and a real upgrade path.

This supports ASDEV Audit goals 3 and 4: paid conversion and production reliability/security.

## Current Problem

`POST /api/projects` calls `canCreateProject()` and later calls `prisma.project.create()` as two independent database operations. Two requests can both observe capacity and then both insert, so the direct API is not a reliable quota boundary.

The current `403 PROJECT_LIMIT_REACHED` response contains neither current usage nor the configured limit or an upgrade destination. The project-creation page converts it to plain text and provides no actionable link.

Authenticated project audit creation already enforces the monthly audit limit inside the serializable `enqueueAuditAtomically()` transaction. The public audit endpoint is an acquisition path without an organization and intentionally remains protected by its existing abuse rate limit rather than subscription quota.

## Chosen Approach

Add a focused `createProjectAtomically()` domain operation. It will run the project count and insert in one Prisma transaction at `Serializable` isolation, retry PostgreSQL `P2034` serialization conflicts up to three times, and return a typed quota error when the limit is reached.

This follows the established atomic audit-enqueue pattern without introducing a schema migration. PostgreSQL advisory locks were rejected because they add database-specific raw SQL and lock-key design. A quota-counter table was rejected because it adds migration and reconciliation complexity that is unnecessary for current scale.

## Domain Interface

Create `src/lib/project-create.ts` with these responsibilities:

- Accept `organizationId`, validated `name`, normalized domain and URL, and the request's plan-limit snapshot.
- Validate that `projectLimit` is a positive integer.
- Within a serializable transaction, count projects for the organization.
- Throw `ProjectCreateError` with code `PROJECT_LIMIT_REACHED`, `current`, and `limit` when capacity is exhausted.
- Insert and return the project when capacity exists.
- Retry only Prisma `P2034` transaction conflicts, at most three total attempts.
- Throw `PROJECT_CREATE_RETRY_EXHAUSTED` if all retry attempts conflict.
- Let unrelated database errors propagate to the route's existing sanitized internal-error handling.

The plan is resolved before entering the transaction. A concurrent subscription change therefore affects the next request, while each creation request uses one internally consistent limit snapshot.

## API Flow

`POST /api/projects` retains the existing order for authentication, CSRF protection, organization lookup, JSON parsing, field validation, and URL normalization. After successful validation:

1. Resolve the organization's current plan.
2. Call `createProjectAtomically()` with the plan's `projectLimit`.
3. Return the existing `201` response on success.
4. Convert `PROJECT_LIMIT_REACHED` into a no-store `403` response:

```json
{
  "error": "PROJECT_LIMIT_REACHED",
  "usage": { "current": 1, "limit": 1 },
  "upgradeUrl": "/app/billing",
  "requestId": "..."
}
```

`upgradeUrl` is a server-owned same-origin constant and is never accepted from request input. The response exposes only the authenticated organization's aggregate quota numbers.

`PROJECT_CREATE_RETRY_EXHAUSTED` returns a no-store, retryable `503` response with `Retry-After: 1`. Unexpected errors return the existing no-store `500 INTERNAL_ERROR` shape. Both paths are logged without credentials or request bodies.

## User Interface

Add a small `ProjectLimitNotice` component that receives `current`, `limit`, and `upgradeUrl`. It renders:

- a Persian quota message containing the exact `current/limit` values;
- a visible link to `/app/billing` labeled for subscription upgrade;
- `role="alert"` so the failed submission is announced;
- existing CSS variables only, with no new dependency or design-system expansion.

The new-project page stores the structured quota response when present, clears stale quota state before each submission, and falls back to its generic error handling for malformed or unrelated API failures. Entered project name and URL remain unchanged after rejection.

The response parser accepts non-negative integer usage counts even when `current > limit`. This is a valid state after a subscription expires or is downgraded because existing projects are not deleted. It preserves the exact counts while continuing to require a same-origin `/app/` upgrade path.

## Concurrency and Failure Semantics

For an organization with limit `1` and zero projects, two concurrent creation attempts must produce exactly one project. One request succeeds; the other either observes the committed row after a serialization retry and receives `PROJECT_LIMIT_REACHED`, or fails closed with `PROJECT_CREATE_RETRY_EXHAUSTED` if conflicts persist.

No request may return success after the organization has reached the limit. Idempotency for project creation is out of scope; this change only makes quota enforcement atomic.

## Testing Strategy

Follow red-green-refactor for each behavior:

1. Unit tests for `createProjectAtomically()` cover under-limit creation, at-limit rejection with exact counts, invalid limits, bounded `P2034` retries, and propagation of unrelated errors.
2. A PostgreSQL integration test, enabled by the repository's existing test-database convention, launches concurrent creates at a limit of one and proves that no more than one project is persisted.
3. Route tests mock the domain operation and verify the `201`, structured no-store `403`, and sanitized `500` contracts while preserving auth and CSRF gates.
4. A component test renders `ProjectLimitNotice` and verifies alert semantics, exact usage text, and the fixed billing link.
5. Existing usage, audit-enqueue, authentication, CSRF, project pages, and full repository gates must continue to pass.

The PostgreSQL test is required evidence when a test database is available; a skipped local run is reported as unverified rather than treated as concurrency proof.

## Non-Goals

- No Prisma schema or production database migration.
- No change to the public `/api/audit/runs` acquisition endpoint.
- No pricing, plan-limit, payment-provider, or billing-page changes.
- No audit quota redesign; the existing atomic audit-enqueue boundary remains authoritative.
- No production deployment, restart, environment mutation, or live data write.

## Acceptance Criteria

- Concurrent authenticated project creation cannot persist more projects than `projectLimit`.
- Direct API requests receive `403 PROJECT_LIMIT_REACHED` with exact `usage.current`, `usage.limit`, and `/app/billing`.
- The new-project UI preserves form values and presents an accessible quota notice with a working upgrade link.
- Public audit acquisition behavior is unchanged.
- No migration is introduced.
- Focused tests, PostgreSQL concurrency evidence when provisioned, `pnpm check`, secret scan, action-pin check, and route smoke checks pass before PR handoff.
