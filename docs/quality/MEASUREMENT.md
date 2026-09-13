# Measurement contract

Updated: 2026-09-13

## Event meanings

| Scorecard event | Evidence | Meaning |
|---|---|---|
| `audit_entry` | consented `seo_audit_page_view` export | Audit entry page was viewed. This is navigation, not an accepted audit. |
| `enqueue_accepted` | consented `seo_audit_run_created` export | The API accepted or reused an audit run. This is not a completed report. |
| `usable_report_ready` | server-side `report_review` funnel export | The AU-11 worker persisted a completed result that entered report review. |
| `audit_error` | consented `seo_audit_error` or server-side `audit_queue_failed` export | A client request or queue operation failed. Retry events remain separate. |

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

The adapter rejects extra fields, duplicate cohort events and malformed dates or counts. `buildMeasurementScorecard` groups by date, locale, device and country, then reports `entryToEnqueue` and `enqueueToUsableReport` only when the relevant denominator exists. A missing denominator produces `null` with `unavailable` coverage. A numerator above its denominator produces `null` with `inconsistent` coverage; neither state becomes zero or 100%.

Use only authorized aggregate exports. GA4, Search Console, live RUM retention, production traffic volume, device/country completeness and any growth outcome are **UNVERIFIED** in this repository. Lab runs and browser emulation must be labelled separately from field data and physical hardware.
