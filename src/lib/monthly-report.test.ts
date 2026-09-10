import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  audits: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    organization: { findUnique: mocks.organization },
    auditRun: { findMany: mocks.audits },
  },
}));

function partialAudit() {
  return {
    id: "partial-run",
    status: "SUCCEEDED",
    summary: {
      schema: "asdev.audit.summary.v1",
      scoringPolicyVersion: "worst-severity-v2",
      score: 100,
      grade: "EXCELLENT",
      categoryScores: { SEO: 100, PERFORMANCE: 100, SECURITY: 100, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100 },
      severityCounts: { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      resultCoverage: {
        schema: "asdev.audit.result-coverage.v1",
        coveredCategories: ["SEO", "SECURITY", "ACCESSIBILITY", "RESILIENCE"],
        unavailableCategories: ["PERFORMANCE", "UX"],
        ratio: 4 / 6,
        confidence: 4 / 6,
        freshness: "FRESH",
        measurementIds: ["category:SEO", "category:SECURITY", "category:ACCESSIBILITY", "category:RESILIENCE"],
        limitations: ["Performance unavailable."],
      },
    },
    findings: [],
    project: { id: "project-1", name: "Synthetic project" },
  };
}

describe("generateMonthlyReport coverage semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.organization.mockResolvedValue({ id: "org-1", name: "Synthetic org" });
    mocks.audits
      .mockResolvedValueOnce([partialAudit()])
      .mockResolvedValueOnce([partialAudit()])
      .mockResolvedValueOnce([]);
  });

  it("does not aggregate a partial empty result into a perfect monthly score", async () => {
    const { generateMonthlyReport } = await import("./monthly-report");
    const report = await generateMonthlyReport("org-1", 9, 2026);

    expect(report.data).toMatchObject({ successfulAudits: 1, comparableAudits: 0, partialAudits: 1, unavailableAudits: 0, averageScore: null });
    expect(Object.values(report.data.scoreBreakdown.categories)).toEqual([null, null, null, null, null, null]);
    expect(report.markdown).toContain("Average Score:** unavailable");
    expect(report.markdown).not.toContain("Average Score: 100/100");
  });
});
