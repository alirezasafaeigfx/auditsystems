# Measurement contract

Updated: 2026-09-13

## Event meanings

| Scorecard event | Evidence | Meaning |
|---|---|---|
| `audit_entry` | consented `seo_audit_page_view` export | Audit entry page was viewed. This is navigation, not an accepted audit. |
| `enqueue_accepted` | consented `seo_audit_run_created` export | The API accepted or reused an audit run. This is not a completed report. |
| `usable_report_ready` | server-side `report_review` funnel export | The AU-11 worker persisted a completed result that entered report review. |
| `audit_error` | consented `seo_audit_error` export | A client audit request failed. Retry events remain separate. |

`report_delivered` records a delivery attempt. It does not prove that a visitor understood the report or took the recommended next action. Those outcomes remain unavailable until a dedicated observable event has a reviewed purpose and consent basis.

## Collection boundaries

- Browser events require `localStorage["asdev_analytics_consent"]` to equal `granted`.
- Event payloads allow only stable aggregate dimensions. Customer URLs, email, phone, report IDs, order IDs, share tokens and unknown fields are discarded. Dynamic report paths are reduced to `/audit/r/:token/...` in both locales.
- RUM ingestion strips queries and fragments from paths. JavaScript error messages are not transmitted because they can contain customer or page data.
- CLS is unitless. FCP, LCP, TTFB, FID and INP are milliseconds. Process-memory Prometheus counters reset with the process and are not a durable 28-day field dataset or a p75 distribution by themselves.
- No persistent cross-domain identity is created by this contract.

## Reproducible scorecard input

`parseMeasurementExport` accepts a JSON array containing only:

```json
[{"date":"2026-09-01","locale":"fa","device":"mobile","country":"IR","event":"audit_entry","count":10}]
```

The adapter rejects extra fields, duplicate cohort events and malformed dates or counts. `buildMeasurementScorecard` groups by date, locale, device and country. `entryToEnqueue` is an aggregate event ratio for consented browser events, not a person-level conversion rate. A missing denominator produces `null` with `unavailable` coverage; a numerator above its denominator produces `null` with `inconsistent` coverage. The current format has no explicit completeness field, so every expected browser-event row must be present in an authorized export before a zero count can be interpreted as measured zero; an omitted row is missing evidence.

`enqueueToUsableReport` is always `null`/`unjoinable`: the existing browser enqueue event has no run ID, while the server report-review event has no locale/device/country cohort. Although `usable_report_ready` is a reserved scorecard event name, no current production export can populate its required cohort truthfully. Leave it unused until a reviewed privacy-safe source supplies compatible dimensions. Server-side `audit_queue_failed` belongs to that future separate funnel contract as well; do not mix it into the browser `audit_error` cohort. Do not assign server events to a device/country without source evidence or interpret the counts as a joined journey.

This adapter does not accept query, page or coverage fields and does not compare 28-day windows. It cannot perform the AU-13 Search Console or non-brand visibility review. Search and funnel observations require separate reviewed import contracts with explicit completeness before they can support a growth verdict.

CLS uses the largest session-window sum (under 1 second between shifts and under 5 seconds per burst) rather than lifetime accumulation; see [web.dev's CLS definition](https://web.dev/articles/cls).

Use only authorized aggregate exports. GA4, Search Console, live RUM retention, production traffic volume, device/country completeness and any growth outcome are **UNVERIFIED** in this repository. Lab runs and browser emulation must be labelled separately from field data and physical hardware.

## AU-12 implementation receipt

- Pull request: [#26](https://github.com/alirezasafaeigfx/auditsystems/pull/26)
- Base: `2d5256c69d97193d56314f72b633a26156109c29`
- Candidate: `c5e825ccd6d18d03b8b6c7c79764845784303f75`
- Merge: `33999f2acb1818ec9b15c299c33472d38bf2239f`
- Generated-doc child immediately after merge: `813e138e7734a55b3736bd9964438634fa94e7ef`
- Candidate verification: lint, typecheck and build passed; Vitest reported 1,096 passed and 41 skipped. The focused privacy, CLS and scorecard tests passed.
- Candidate hosted runs: Main Gate `34780308613`, Roadmap `34780308671`, Docs `34780308662`, PostgreSQL `34780308665`; all passed for the candidate SHA.
- Post-merge hosted runs: Main Gate `34780556478`, Roadmap `34780556464`, Docs `34780556441`; all passed for the merge SHA.
- Independent session review found three material issues in the first candidate. The final candidate fixed all three and the re-review reported no remaining material finding. This is not a durable GitHub human approval.
- Deployed SHA and live collection remain **UNVERIFIED**.
