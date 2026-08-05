# Performance and Core Web Vitals Evidence Policy Design

## Objective

Implement Issue #33 on top of the canonical evidence contract without inventing Core Web Vitals. Field evidence, lab evidence, local diagnostics, and unavailable evidence remain distinct through collection, storage, API serialization, and PDF rendering.

## Evidence hierarchy

1. `MEASURED` field metrics come only from valid CrUX payloads returned by the approved PageSpeed Insights provider.
2. `OBSERVED` lab metrics come only from valid Lighthouse payloads returned by the provider for the requested mobile or desktop strategy.
3. `OBSERVED` diagnostics come from AuditSystems' own bounded HTML fetch and resource inspection. They retain diagnostic names such as response time, TTFB, resource count, blocking-script count, and images without dimensions.
4. `UNAVAILABLE` is emitted when credentials are absent, the provider is rate-limited/unauthorized/timed out, the payload is invalid, or a requested metric has no evidence.

Diagnostics are never serialized under `lcp`, `inp`, or `cls`. Lighthouse total blocking time is never relabeled as INP. A missing CrUX metric is not a pass.

## Provider adapter

The adapter accepts an injected `fetch` implementation, an API key, a requested URL, a strategy, a clock, timeout, and maximum response bytes. It validates a bounded public HTTP(S) URL shape, calls PageSpeed Insights at most once per strategy, limits response bytes, and maps outcomes to:

- `SUCCESS`
- `PARTIAL`
- `RATE_LIMITED`
- `UNAUTHORIZED`
- `TIMEOUT`
- `INVALID_RESPONSE`
- `UNAVAILABLE`

The normalized result records provider, strategy, requested URL, provider final URL, collection time, expiration, status, field metrics, lab metrics, coverage, confidence, limitations, and a key-free raw reference.

## Request budget and cache policy

- QUICK audits request mobile only.
- DEEP audits request mobile and desktop, with a hard maximum of two provider calls.
- Provider calls are disabled unless `PAGESPEED_API_KEY` is present.
- Field evidence TTL: 24 hours.
- Lab evidence TTL: 6 hours.
- Cache identity includes provider policy version, requested URL, and strategy.
- Stale evidence is identifiable and cannot be presented as current.

This PR defines deterministic cache metadata and stale detection but does not introduce a new persistence table or shared cache backend.

## Coverage and confidence

The performance bundle exposes evidence coverage and confidence rather than fabricating a numeric performance score:

- field coverage: available CrUX LCP/INP/CLS slots divided by three;
- lab coverage: available Lighthouse LCP/CLS/FCP/TBT slots divided by four for each strategy;
- diagnostic coverage: available bounded local diagnostic slots;
- overall coverage is the mean of requested evidence groups;
- confidence weights field evidence above lab evidence and lab evidence above diagnostics;
- `score` remains `null` and `withheldReason` explains insufficient or mixed evidence until a separately versioned scoring policy is approved.

Provider failure cannot improve coverage, confidence, or the legacy score.

## Runtime integration

The worker measures TTFB at response-header arrival and total response duration after the bounded body is read. It collects provider evidence only when configured, builds diagnostics from the fetched page, and persists the normalized performance bundle inside the existing summary JSON. No database migration is required.

Legacy CWV proxy findings stop being emitted. They are replaced by diagnostics whose titles and evidence explicitly state that they are observed or heuristic risk indicators, not Core Web Vitals measurements. Legacy codes remain in the type union for historical record compatibility.

## Report behavior

PDF reports render:

- provider status and strategy;
- field and lab labels;
- metric values only when evidence exists;
- `Unavailable` plus a next action when evidence is missing;
- coverage, confidence, limitations, and collection time.

The report must never describe unavailable CrUX data as passing or failing real-user CWV.

## Safety boundaries

- no production credential, provider billing, environment, deployment, or migration mutation;
- no live provider call during implementation or tests;
- no unbounded response parsing;
- no API key in logs, raw references, summaries, or cache keys;
- no new external dependency.
