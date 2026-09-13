import { describe, expect, it } from "vitest";
import { buildMeasurementScorecard, parseMeasurementExport } from "./measurement-scorecard";

describe("measurement scorecard", () => {
  it("builds qualified cohort rates from aggregate authorized exports", () => {
    const rows = parseMeasurementExport(JSON.stringify([
      { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "audit_entry", count: 10 },
      { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "enqueue_accepted", count: 7 },
      { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "usable_report_ready", count: 4 },
      { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "audit_error", count: 2 },
    ]));
    expect(buildMeasurementScorecard(rows)).toEqual([expect.objectContaining({
      cohort: { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR" },
      counts: { auditEntry: 10, enqueueAccepted: 7, usableReportReady: 4, auditError: 2 },
      rates: { entryToEnqueue: 0.7, enqueueToUsableReport: null },
      coverage: { entryToEnqueue: "available", enqueueToUsableReport: "unjoinable" },
    })]);
  });

  it("marks rates unavailable when their denominator is absent", () => {
    const rows = parseMeasurementExport(JSON.stringify([
      { date: "2026-09-02", locale: "en", device: "desktop", country: "US", event: "audit_error", count: 1 },
    ]));
    expect(buildMeasurementScorecard(rows)[0]).toMatchObject({
      rates: { entryToEnqueue: null, enqueueToUsableReport: null },
      coverage: { entryToEnqueue: "unavailable", enqueueToUsableReport: "unjoinable" },
    });
  });

  it("does not publish impossible conversion rates", () => {
    const rows = parseMeasurementExport(JSON.stringify([
      { date: "2026-09-02", locale: "en", device: "desktop", country: "US", event: "audit_entry", count: 1 },
      { date: "2026-09-02", locale: "en", device: "desktop", country: "US", event: "enqueue_accepted", count: 2 },
    ]));
    expect(buildMeasurementScorecard(rows)[0]).toMatchObject({
      rates: { entryToEnqueue: null },
      coverage: { entryToEnqueue: "inconsistent" },
    });
  });

  it("rejects raw identifiers, PII fields and malformed aggregate rows", () => {
    expect(() => parseMeasurementExport(JSON.stringify([
      { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "audit_entry", count: 1, email: "person@example.com" },
    ]))).toThrow(/unexpected field/i);
    expect(() => parseMeasurementExport(JSON.stringify([
      { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "audit_entry", count: -1 },
    ]))).toThrow(/count/i);
    expect(() => parseMeasurementExport(JSON.stringify([
      { date: "2026-99-99", locale: "fa", device: "mobile", country: "IR", event: "audit_entry", count: 1 },
    ]))).toThrow(/date/i);
  });

  it("rejects duplicate cohort events instead of silently double counting", () => {
    const row = { date: "2026-09-01", locale: "fa", device: "mobile", country: "IR", event: "audit_entry", count: 1 };
    expect(() => parseMeasurementExport(JSON.stringify([row, row]))).toThrow(/duplicate/i);
  });
});
