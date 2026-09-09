# Hosting Sync Diagnostics Design

## Goal

Make hosting-sync findings describe repository or infrastructure evidence accurately on the declared GitHub-hosted runner without changing infrastructure or weakening unavailable-evidence handling.

## Proven causes

- The four repository-content failures in run `34387931972` are false positives because `rg` is unavailable while all four literals exist at the candidate SHA.
- The production DNS default was introduced in February 2026 and conflicts with the current public A record and the July 2026 repository governance.
- Staging DNS is currently NXDOMAIN from three independent resolvers, while repository documents disagree about whether staging is still active.
- Active host ports, process names, symlinks, and deployed SHA cannot be verified without authorized on-host evidence.

## Design

Use portable `grep -F` for repository literals and local socket output. Treat failed `dig`, `ss`, or `curl` execution as unavailable evidence that increments the failure count. Retain warnings for observable DNS/HTTP discrepancies and for intentionally omitted SSH evidence. Align only the production public A-record expectation with current authoritative repository governance; keep port and staging expectations unchanged until issue #12 is resolved.

## Acceptance

1. A deterministic fixture with an unusable `rg` still recognizes all four repository literals.
2. The current public production A record is accepted by the default contract.
3. Failed DNS and socket tools produce explicit evidence-unavailable failures.
4. The regression test runs in the required main gate.
5. No deploy, infrastructure, secret, database, runner, payment, or live-service mutation occurs.
