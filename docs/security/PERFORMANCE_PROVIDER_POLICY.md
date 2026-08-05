# Performance Provider and Evidence Policy

## Evidence classes

AuditSystems keeps three performance evidence classes separate:

- **Field (`MEASURED`)**: CrUX LCP, INP, and CLS returned by PageSpeed Insights for the requested URL, or origin-level field data when the provider explicitly falls back.
- **Lab (`OBSERVED`)**: Lighthouse LCP, CLS, FCP, and TBT for an explicit mobile or desktop strategy.
- **Diagnostics (`OBSERVED` or finding-level `HEURISTIC`)**: bounded local observations such as HTML response time, header-arrival TTFB, resource count, blocking-script count, and images without dimensions.

Local diagnostics are not Core Web Vitals. Lighthouse TBT is not INP. Missing field evidence is never interpreted as a pass.

## Provider activation

The provider is optional:

```dotenv
PAGESPEED_API_KEY=""
```

When this value is empty, AuditSystems performs no PageSpeed network request and stores explicit `UNAVAILABLE` field and lab metric slots with a next action. Tests use injected fetch fixtures and never call the live provider.

## Request budget

- QUICK audit: mobile only; maximum one provider request.
- DEEP audit: mobile plus desktop; maximum two provider requests.
- Per-request timeout: 12 seconds by default, bounded to 30 seconds.
- Maximum parsed response: 1 MB by default, bounded to 5 MB.
- Only HTTP(S) target URLs without embedded credentials are accepted by the adapter.

The API key exists only in the transient outbound request. It is not written to cache identities, raw references, summaries, findings, logs, or reports.

## Provider status mapping

Normalized statuses are:

- `SUCCESS`
- `PARTIAL`
- `RATE_LIMITED`
- `UNAUTHORIZED`
- `TIMEOUT`
- `INVALID_RESPONSE`
- `UNAVAILABLE`

Provider failure must not fail the base HTML audit, improve evidence coverage, increase confidence, or create metric values.

## Cache metadata and staleness

- CrUX field TTL: 24 hours.
- Lighthouse lab TTL: 6 hours.
- A combined strategy result becomes stale when its lab TTL expires.
- Cache identity includes policy version, requested URL, and strategy.
- Mobile and desktop evidence never share one cache identity.

This workstream defines deterministic cache metadata and stale detection. It does not add a shared cache table or activate provider billing.

## Coverage, confidence, and scoring

The bundle reports field, lab, diagnostic, and overall coverage. Confidence weights field evidence above lab evidence and lab evidence above local diagnostics.

`score` remains `null`. `withheldReason` states that no approved, versioned performance-scoring policy exists. The legacy audit score continues to derive from findings, but misleading positive or negative CWV proxy findings are removed from new runtime results.

## Reporting

The PDF evidence section labels field and lab sources, strategy, provider status, collection time, coverage, confidence, limitations, and unavailable metrics. An unavailable metric is rendered as `Unavailable` with a next action—never as good, poor, passed, or failed.

## Operational safety

This policy does not:

- add or rotate a provider credential;
- activate provider billing;
- run a live provider request during CI;
- deploy to staging or production;
- change the database schema;
- introduce an external dependency.
