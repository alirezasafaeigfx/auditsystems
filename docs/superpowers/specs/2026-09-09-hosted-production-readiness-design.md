# Hosted Production Readiness Design

## Goal

Keep the non-deploying `production-readiness` workflow runnable when no repository self-hosted runner is registered.

## Scope

- Change only the `readiness` job in `.github/workflows/production-readiness.yml` from the unavailable `asdev-ci` runner to `ubuntu-latest`.
- Extend the existing runner-contract gate so it fails if that job stops using the exact hosted runner strategy.
- Preserve `.github/workflows/deploy-vps-manual.yml` and `.github/workflows/nightly-audit.yml` unchanged.

## Rationale

The readiness workflow performs source checkout, dependency installation, validation, network probes, and artifact upload. It has no SSH or deployment step and no host-local dependency. A GitHub-hosted Linux runner satisfies its declared Node and pnpm setup while avoiding an unavailable infrastructure dependency.

## Acceptance

1. The existing runner-contract script fails against the current self-hosted readiness job.
2. The same script passes after the workflow uses `ubuntu-latest`.
3. Required repository gates pass without modifying the lockfile.
4. The two sensitive workflows remain byte-for-byte identical to the base commit.
5. A pull request is created and a real `production-readiness` run is requested for its exact candidate SHA; deployment is not performed.
