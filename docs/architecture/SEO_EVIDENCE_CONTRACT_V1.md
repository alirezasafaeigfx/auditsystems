# SEO Audit Evidence Contract v1

Status: design contract for #32. No database migration or production behavior is introduced by this document.

## Objective

Every customer-visible SEO finding, metric, category score, and total score must be reproducible from stored evidence and a versioned policy. The system must never present an inference or provider failure as measured fact.

## Evidence classes

| Class | Meaning | Examples | Report wording |
|---|---|---|---|
| `MEASURED` | Produced by an approved field/provider source with explicit methodology | CrUX field LCP, approved backlink-provider count | “Measured by …” |
| `OBSERVED` | Directly detected from fetched, rendered, parsed, or lab-run evidence | HTTP status, canonical tag, Lighthouse lab result | “Observed during this audit …” |
| `HEURISTIC` | Rule-based inference or proxy | content-structure proxy, likely crawl risk | “Rule-based assessment; verify …” |
| `UNAVAILABLE` | Evidence could not be collected or was outside scope | no CrUX coverage, provider timeout | “Not available; no pass/fail conclusion …” |

`UNAVAILABLE` is a state, not a zero, pass, or failure. `HEURISTIC` must never be serialized under a measured field-data key.

## Canonical entities

### AuditEvidence

Required fields:

- `id`: stable identifier within the audit
- `schemaVersion`: evidence-schema version, initially `1.0.0`
- `methodVersion`: collector/parser/provider method version
- `evidenceClass`: `MEASURED | OBSERVED | HEURISTIC | UNAVAILABLE`
- `source`: collector or subsystem name
- `provider`: external provider name when applicable
- `collectedAt`: ISO-8601 UTC timestamp
- `requestedUrl`: URL requested by the audit
- `finalUrl`: final URL after approved redirects, when available
- `scope`: page, origin, sitemap, crawl sample, account, or provider dataset scope
- `status`: `SUCCESS | PARTIAL | RATE_LIMITED | UNAUTHORIZED | TIMEOUT | INVALID_RESPONSE | BLOCKED | UNAVAILABLE`
- `confidence`: bounded value from `0` to `1`
- `summary`: report-safe evidence summary
- `rawReference`: optional internal artifact reference, never a secret
- `limitations`: explicit limitations array
- `expiresAt`: optional cache freshness boundary
- `contentFingerprint`: optional deterministic fingerprint

### AuditFinding

Required fields:

- `id`
- `ruleId`
- `ruleVersion`
- `title`
- `severity`: `CRITICAL | HIGH | MEDIUM | LOW | INFO`
- `status`: `CONFIRMED | INFERRED | UNAVAILABLE | RESOLVED`
- `evidenceIds`: one or more evidence references, except an explicitly unavailable finding
- `impact`: bounded, non-guaranteed technical/business impact statement
- `recommendation`
- `verificationMethod`
- `limitations`
- `affectedUrls`

A finding cannot be `CONFIRMED` solely from heuristic evidence.

### AuditMetric

Required fields:

- `key`
- `label`
- `value`: number, string, boolean, or null
- `unit`
- `evidenceClass`
- `evidenceIds`
- `provider`
- `strategy`: field, lab-mobile, lab-desktop, rendered, fetched, crawl, manual, or proxy
- `coverage`: numeric ratio or explicit scope description
- `status`
- `limitations`

Metrics with `UNAVAILABLE` evidence use `value: null`; they do not invent a fallback value.

### ScoreBreakdown

Required fields:

- `policyVersion`
- `category`
- `weight`
- `rawScore`: optional when evidence coverage is sufficient
- `weightedScore`: optional when evidence coverage is sufficient
- `coverage`
- `confidence`
- `deductions`: rule ID, amount, evidence IDs, explanation
- `credits`: rule ID, amount, evidence IDs, explanation
- `unknownRules`: rules that could not be evaluated
- `withheldReason`: required when a precise score is withheld

## Scoring rules

1. The same evidence set and policy version must always produce the same score.
2. A provider failure cannot improve a score.
3. Unknown evidence reduces coverage; it is not silently treated as passing.
4. A precise score may be withheld when coverage is below the policy threshold.
5. Every deduction and credit must cite evidence and a rule version.
6. Category weights, caps, floors, and thresholds are policy data, not hidden constants.
7. Content length alone cannot create a critical finding.
8. A total score must expose category scores, coverage, confidence, and policy version.

## Confidence guidance

- `0.90–1.00`: direct, repeatable, high-quality measured or observed evidence
- `0.70–0.89`: strong evidence with known limitations or partial scope
- `0.40–0.69`: proxy or partial evidence requiring verification
- `0.00–0.39`: weak, conflicting, stale, or unavailable evidence; do not make a strong conclusion

Confidence does not replace evidence class. A heuristic remains heuristic even at high confidence.

## Partial audit behavior

Reports must include:

- requested scope
- collected scope
- coverage percentage or explicit sampled URLs
- unavailable providers/surfaces
- stale evidence warnings
- score-withholding reason when applicable
- next action to improve evidence

A partial audit may produce confirmed findings for covered surfaces while withholding unsupported site-wide conclusions.

## Report language contract

### Confirmed

“Observed on the analyzed URL during collection at `<timestamp>`.”

### Measured

“Measured by `<provider>` using `<strategy>` at `<timestamp>`.”

### Inferred

“Rule-based assessment derived from `<evidence>`; verify using `<verification method>`.”

### Unavailable

“Evidence was unavailable because `<reason>`. No pass/fail conclusion was assigned.”

Avoid unsupported claims about Google rankings, revenue, traffic growth, conversion uplift, or business outcomes.

## Cache and artifact requirements

Every cached artifact must include:

- schema version
- method version
- created and expiry timestamps
- requested and final URL
- source/provider
- content fingerprint where applicable
- freshness state: `FRESH | STALE_USABLE | STALE_BLOCKED | CORRUPT`

A method-version change invalidates incompatible cache entries.

## Backward compatibility

Legacy audit records may not be silently upgraded into evidence-grade records.

Migration behavior:

- preserve the original payload
- label unmapped legacy values as `HEURISTIC` or `UNAVAILABLE` only when justified
- record `legacySource: true`
- assign a compatibility method version
- expose limitations in reports
- never recast a historical synthetic metric as measured evidence

Database migration requires separate development/test validation and owner approval.

## Security and privacy

- raw references must not contain tokens, credentials, private headers, session cookies, or customer secrets
- URLs and artifacts must retain SSRF protections
- public-safe reports must redact customer identifiers and internal infrastructure
- external provider payloads should be minimized and retained according to policy

## Implementation sequence

1. Inventory current persistence, API, worker, report, and score shapes.
2. Map each current field to this contract or mark it legacy/unmapped.
3. Introduce typed in-memory/domain models.
4. Add serialization and invariants tests.
5. Add compatibility adapters for legacy records.
6. Validate on an isolated development/test database.
7. Only then propose persistence migration.

## Acceptance checklist for #32

- [ ] canonical types implemented
- [ ] JSON serialization matches the versioned schema
- [ ] evidence classes cannot be confused in tests
- [ ] unavailable evidence never becomes a passing score
- [ ] same evidence and policy produce the same score
- [ ] legacy fixture behavior is documented and tested
- [ ] no production migration or deploy occurs without owner approval
