# AU-02 Score and Coverage Design

## Objective

Prevent absent, failed, partial, malformed, unsupported, contradictory, duplicate, or legacy measurement evidence from silently appearing as a complete `100/100` result across report HTML/RSC, report API, comparison, and PDF delivery.

## Bounded contract

The existing worst-severity score weights, thresholds, grade boundaries, and rounding remain unchanged. A new in-memory result resolver separates:

- numeric finding-risk score;
- processing status;
- evidence coverage and covered categories;
- availability (`AVAILABLE`, `PARTIAL`, `UNAVAILABLE`, `LEGACY`, or `INVALID`);
- confidence and an explicit withheld reason.

Current summaries produced by the worker persist a versioned `resultCoverage` object. SEO, security, accessibility, and resilience are covered only after a successful bounded fetch/parser/rule pass. Performance evidence is diagnostic and has no approved numeric scoring policy, while no runtime UX measurement policy exists; both categories therefore remain unavailable and never receive a synthetic `100`.

Legacy summaries remain readable but are labeled `LEGACY` with unknown coverage. A complete internally consistent legacy numeric score may be displayed only with that limitation. Missing or malformed current coverage, unsupported schema/policy versions, contradictory stored aggregates, impossible ratios, duplicate measurement identities, or non-terminal processing states with a score cause the numeric result to be withheld.

## Surface semantics

All report consumers use the same resolver. HTML/RSC and PDF show localized partial/unavailable/legacy labels. The report API returns a machine-readable result object. Comparison emits numeric deltas only when both results are available under the same compatible policy and coverage state; otherwise it reports `unavailable`. No stored historical report is rewritten.

## Security and compatibility

AU-01 access enforcement, download entitlement, SSRF/DNS pinning, redirect bounds, rate limits, and no-store behavior remain unchanged. Fixtures use only `.invalid` URLs and synthetic records. No schema migration, dependency update, deployment, or infrastructure mutation is part of AU-02.
