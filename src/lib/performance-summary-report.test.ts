import { describe, expect, it } from "vitest";
import { formatPerformanceEvidenceLines } from "./performance-report";
import { buildAuditSummaryV1 } from "./summary";
import type { PerformanceEvidenceBundle } from "./performance-evidence";

function performanceFixture(): PerformanceEvidenceBundle {
  return {
    policyVersion: "performance-evidence.v1",
    requestedUrl: "https://example.com/",
    finalUrl: "https://www.example.com/",
    collectedAt: "2026-08-05T12:00:00.000Z",
    providerResults: [
      {
        provider: "GOOGLE_PAGESPEED_INSIGHTS",
        strategy: "mobile",
        requestedUrl: "https://example.com/",
        finalUrl: "https://www.example.com/",
        collectedAt: "2026-08-05T12:00:00.000Z",
        expiresAt: "2026-08-05T18:00:00.000Z",
        status: "PARTIAL",
        cacheKey: "performance-evidence.v1:mobile:opaque",
        rawReference: "pagespeed:mobile:opaque",
        fieldMetrics: [
          { key: "lcp", label: "Largest Contentful Paint", value: 2200, unit: "ms", evidenceClass: "MEASURED", provider: "GOOGLE_CRUX", strategy: "field-url", status: "SUCCESS", coverage: 1, limitations: [] },
          { key: "inp", label: "Interaction to Next Paint", value: null, unit: "ms", evidenceClass: "UNAVAILABLE", provider: "GOOGLE_CRUX", strategy: "field-url", status: "UNAVAILABLE", coverage: 0, limitations: ["CrUX did not return INP for this URL."] },
          { key: "cls", label: "Cumulative Layout Shift", value: 0.12, unit: "score", evidenceClass: "MEASURED", provider: "GOOGLE_CRUX", strategy: "field-url", status: "SUCCESS", coverage: 1, limitations: [] },
        ],
        labMetrics: [
          { key: "lcp", label: "Largest Contentful Paint", value: 2450, unit: "ms", evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile", status: "SUCCESS", coverage: 1, limitations: ["Lab result; not real-user field data."] },
          { key: "cls", label: "Cumulative Layout Shift", value: 0.09, unit: "score", evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile", status: "SUCCESS", coverage: 1, limitations: ["Lab result; not real-user field data."] },
          { key: "fcp", label: "First Contentful Paint", value: 1200, unit: "ms", evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile", status: "SUCCESS", coverage: 1, limitations: ["Lab result; not real-user field data."] },
          { key: "tbt", label: "Total Blocking Time", value: 210, unit: "ms", evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile", status: "SUCCESS", coverage: 1, limitations: ["TBT is not INP."] },
        ],
        coverage: { field: 2 / 3, lab: 1 },
        confidence: 0.75,
        limitations: ["Field INP unavailable."],
      },
    ],
    diagnostics: {
      evidenceClass: "OBSERVED",
      status: "SUCCESS",
      collectedAt: "2026-08-05T12:00:00.000Z",
      requestedUrl: "https://example.com/",
      finalUrl: "https://www.example.com/",
      metrics: [
        { key: "response_ms", label: "Total HTML response time", value: 1600, unit: "ms" },
        { key: "ttfb_ms", label: "Time to first byte", value: 240, unit: "ms" },
      ],
      limitations: ["Diagnostics are not Core Web Vitals measurements."],
    },
    coverage: { field: 2 / 3, lab: 1, diagnostics: 1, overall: 8 / 9 },
    confidence: 0.8,
    score: null,
    withheldReason: "No approved versioned performance scoring policy.",
    limitations: ["One field metric is unavailable."],
  };
}

describe("performance evidence summary and report round trip", () => {
  it("preserves the classified performance bundle in AuditSummaryV1", () => {
    const performance = performanceFixture();
    const summary = buildAuditSummaryV1({
      runId: "run-performance-1",
      inputUrl: "https://example.com/",
      normalizedUrl: "https://example.com/",
      finalUrl: "https://www.example.com/",
      depth: "QUICK",
      durationMs: 2000,
      headers: {},
      resources: [],
      findings: [],
      seo: { title: true, metaDescription: true, canonical: true, openGraph: true },
      performance,
    });

    expect(summary.performance).toEqual(performance);
    expect(summary.performance?.providerResults[0].fieldMetrics[0].evidenceClass).toBe("MEASURED");
    expect(summary.performance?.providerResults[0].labMetrics[0].evidenceClass).toBe("OBSERVED");
    expect(summary.performance?.score).toBeNull();
  });

  it("formats unavailable evidence as unavailable with a next action, never pass or fail", () => {
    const lines = formatPerformanceEvidenceLines(performanceFixture());
    const text = lines.join("\n");

    expect(text).toContain("Field (CrUX)");
    expect(text).toContain("Lab (Lighthouse mobile)");
    expect(text).toContain("INP: Unavailable");
    expect(text).toContain("Next action");
    expect(text).toContain("Coverage");
    expect(text).toContain("Confidence");
    expect(text).not.toMatch(/INP: (Good|Poor|Passed|Failed)/i);
    expect(text).not.toContain("TBT as INP");
  });
});
