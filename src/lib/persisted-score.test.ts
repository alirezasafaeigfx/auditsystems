import { describe, expect, it } from "vitest";
import { calculateScore } from "./scoring";
import { CURRENT_SCORING_POLICY_VERSION, LEGACY_SCORING_POLICY_VERSION, scoreFromPersistedSummary, scoringPolicyVersionFromSummary } from "./persisted-score";

describe("scoreFromPersistedSummary", () => {
  it("uses a complete valid legacy summary instead of recalculating it", () => {
    const calculated = calculateScore([{ category: "SECURITY", severity: "CRITICAL" }]);
    const persisted = {
      score: 44,
      grade: "NEEDS_WORK",
      categoryScores: { SEO: 100, PERFORMANCE: 100, SECURITY: 44, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100 },
      severityCounts: { INFO: 0, LOW: 1, MEDIUM: 0, HIGH: 0, CRITICAL: 1 },
    };
    expect(scoreFromPersistedSummary(persisted, calculated)).toMatchObject({
      overall: 44,
      grade: "NEEDS_WORK",
      categories: persisted.categoryScores,
      severityCounts: persisted.severityCounts,
    });
  });

  it("rejects incomplete or invalid persisted summary fields", () => {
    const calculated = calculateScore([{ category: "SEO", severity: "HIGH" }]);
    expect(scoreFromPersistedSummary({ score: 101, grade: "EXCELLENT", categoryScores: {}, severityCounts: {} }, calculated)).toBe(calculated);
    expect(scoreFromPersistedSummary({ score: 40, grade: "EXCELLENT", categoryScores: { SEO: 40 }, severityCounts: {} }, calculated)).toBe(calculated);
  });

  it("treats absent policy versions as legacy and recognizes the current policy", () => {
    expect(scoringPolicyVersionFromSummary({})).toBe(LEGACY_SCORING_POLICY_VERSION);
    expect(scoringPolicyVersionFromSummary({ scoringPolicyVersion: CURRENT_SCORING_POLICY_VERSION })).toBe(CURRENT_SCORING_POLICY_VERSION);
  });
});
