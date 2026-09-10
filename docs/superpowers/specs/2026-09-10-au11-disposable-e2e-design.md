# AU-11 Disposable End-to-End Audit Flow Design

## Goal

Prove the production code path from a submitted URL through transactional enqueue, a real leased worker execution, persisted result, authorized report delivery, and PDF delivery using only a disposable PostgreSQL service and a controlled loopback fixture.

## Scope

The test submits through `POST /api/audit/runs`, invokes a reusable single worker cycle backed by the real queue and `auditRunHandler`, and reads the persisted run through the existing report, API, and PDF handlers. It covers success with deliberately unavailable performance evidence, duplicate idempotent submission, retry followed by terminal failure, and protected report delivery.

## Security Boundaries

The fixture server is allowed only by the existing `AUDIT_ALLOW_LOCAL_FIXTURE=true` non-production guard. No production code receives a bypass. The test sets synthetic secrets, protects the generated share with a synthetic password hash, verifies unauthenticated denial, and uses the existing report-bound access credential for authorized report and PDF access. It never contacts a customer URL or live environment.

## Design

Extract the existing lease processing body from `src/worker/index.ts` into a focused exported worker-cycle module. The long-running entrypoint continues to use that module unchanged. An opt-in PostgreSQL Vitest integration test starts a loopback HTTP fixture, calls the actual submission route, drives one leased worker cycle at a time, and asserts database state and handler responses. A dedicated GitHub Actions workflow supplies an ephemeral PostgreSQL service and runs the test.

## Non-goals

This does not alter queue policy, scoring weights, report authorization policy, schema, deployment scripts, or live infrastructure. It does not claim a deployed SHA or Production acceptance.
