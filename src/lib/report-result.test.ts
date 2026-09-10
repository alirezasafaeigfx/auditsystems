import { describe, expect, it } from "vitest";
import { resolveReportResult } from "./report-result";
import type { FindingCategory, FindingSeverity } from "./types";

const categories: FindingCategory[] = ["SEO", "PERFORMANCE", "SECURITY", "UX", "ACCESSIBILITY", "RESILIENCE"];
const counts = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

function finding(category: FindingCategory, severity: FindingSeverity, code = `${category}-${severity}`) {
  return { category, severity, code };
}

function currentSummary(overrides: Record<string, unknown> = {}) {
  return {
    schema: "asdev.audit.summary.v1",
    scoringPolicyVersion: "worst-severity-v2",
    score: 100,
    grade: "EXCELLENT",
    categoryScores: Object.fromEntries(categories.map((category) => [category, 100])),
    severityCounts: counts,
    resultCoverage: {
      schema: "asdev.audit.result-coverage.v1",
      coveredCategories: categories,
      unavailableCategories: [],
      ratio: 1,
      confidence: 1,
      freshness: "FRESH",
      measurementIds: categories.map((category) => `category:${category}`),
      limitations: [],
    },
    ...overrides,
  };
}

describe("resolveReportResult", () => {
  it("distinguishes a complete successful result from an empty measurement collection", () => {
    expect(resolveReportResult({ summary: currentSummary(), findings: [], runStatus: "SUCCEEDED" })).toMatchObject({
      availability: "AVAILABLE", score: { overall: 100 }, coverage: { ratio: 1 }, processingStatus: "SUCCEEDED",
    });

    const empty = currentSummary({ resultCoverage: { ...currentSummary().resultCoverage, coveredCategories: [], unavailableCategories: categories, ratio: 0, confidence: 0, measurementIds: [] } });
    expect(resolveReportResult({ summary: empty, findings: [], runStatus: "SUCCEEDED" })).toMatchObject({
      availability: "UNAVAILABLE", score: null, coverage: { ratio: 0 },
    });
  });

  it("labels partial and mixed results without counting unknown categories as passing", () => {
    const findings = [finding("SECURITY", "HIGH")];
    const summary = currentSummary({
      score: 40,
      grade: "CRITICAL",
      categoryScores: { SEO: 100, SECURITY: 40, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100, PERFORMANCE: 100 },
      severityCounts: { ...counts, HIGH: 1 },
      resultCoverage: {
        ...currentSummary().resultCoverage,
        coveredCategories: ["SEO", "SECURITY", "UX"],
        unavailableCategories: ["PERFORMANCE", "ACCESSIBILITY", "RESILIENCE"],
        ratio: 0.5,
        confidence: 0.5,
        measurementIds: ["category:SEO", "category:SECURITY", "category:UX"],
        limitations: ["Three categories were unavailable."],
      },
    });
    const result = resolveReportResult({ summary, findings, runStatus: "SUCCEEDED" });
    expect(result).toMatchObject({ availability: "PARTIAL", score: { overall: 40 }, coverage: { ratio: 0.5 } });
    expect(result.categoryScores.PERFORMANCE).toBeNull();
    expect(result.categoryScores.SECURITY).toBe(40);
  });

  it.each([
    ["terminal failure", currentSummary(), "FAILED"],
    ["stale evidence", currentSummary({ resultCoverage: { ...currentSummary().resultCoverage, freshness: "STALE_BLOCKED" } }), "SUCCEEDED"],
    ["missing coverage", currentSummary({ resultCoverage: undefined }), "SUCCEEDED"],
    ["unsupported coverage schema", currentSummary({ resultCoverage: { ...currentSummary().resultCoverage, schema: "future-v2" } }), "SUCCEEDED"],
    ["malformed ratio", currentSummary({ resultCoverage: { ...currentSummary().resultCoverage, ratio: 2 } }), "SUCCEEDED"],
    ["duplicate measurements", currentSummary({ resultCoverage: { ...currentSummary().resultCoverage, measurementIds: ["duplicate", "duplicate"] } }), "SUCCEEDED"],
  ])("withholds a numeric score for %s", (_name, summary, runStatus) => {
    expect(resolveReportResult({ summary, findings: [], runStatus: runStatus as string }).score).toBeNull();
  });

  it("fails closed when current persisted aggregates contradict the measurements", () => {
    const result = resolveReportResult({
      summary: currentSummary({ score: 100, grade: "EXCELLENT" }),
      findings: [finding("SECURITY", "CRITICAL")],
      runStatus: "SUCCEEDED",
    });
    expect(result).toMatchObject({ availability: "INVALID", score: null });
  });

  it("preserves a valid legacy score but labels its coverage unknown", () => {
    const legacy = {
      score: 44,
      grade: "NEEDS_WORK",
      categoryScores: { SEO: 100, PERFORMANCE: 100, SECURITY: 44, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100 },
      severityCounts: { ...counts, LOW: 1 },
    };
    expect(resolveReportResult({ summary: legacy, findings: [finding("SECURITY", "LOW")], runStatus: "SUCCEEDED" })).toMatchObject({
      availability: "LEGACY", score: { overall: 44 }, coverage: { ratio: null },
    });
  });
});
