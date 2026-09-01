import { describe, it, expect } from "vitest";
import { calculateScore, formatScore, gradeLabel, categoryLabel } from "./scoring";
import type { FindingCategory, FindingSeverity } from "./types";

function makeFinding(category: FindingCategory, severity: FindingSeverity) {
  return { category, severity };
}

describe("scoring", () => {
  it("returns 100 for empty findings", () => {
    const score = calculateScore([]);
    expect(score.overall).toBe(100);
    expect(score.grade).toBe("EXCELLENT");
    expect(score.totalFindings).toBe(0);
  });

  it("returns lower score for more severe findings", () => {
    const critical = calculateScore([makeFinding("SECURITY", "CRITICAL")]);
    const low = calculateScore([makeFinding("SECURITY", "LOW")]);
    expect(critical.overall).toBeLessThan(low.overall);
  });

  it("preserves legacy single-finding score contract for every severity", () => {
    const expected = { CRITICAL: 0, HIGH: 40, MEDIUM: 68, LOW: 88, INFO: 100 } as const;
    for (const [severity, score] of Object.entries(expected)) {
      const result = calculateScore([makeFinding("SECURITY", severity as FindingSeverity)]);
      expect(result.overall).toBe(score);
      expect(result.categories.SECURITY).toBe(score);
    }
  });

  it("uses the worst severity so additions never improve and INFO is neutral", () => {
    const baseline = calculateScore([makeFinding("SEO", "HIGH")]);
    const withLower = calculateScore([makeFinding("SEO", "HIGH"), makeFinding("SEO", "LOW")]);
    const withInfo = calculateScore([makeFinding("SEO", "HIGH"), makeFinding("SEO", "INFO")]);
    expect(withLower.overall).toBeLessThanOrEqual(baseline.overall);
    expect(withLower.categories.SEO).toBeLessThanOrEqual(baseline.categories.SEO);
    expect(withInfo.overall).toBe(baseline.overall);
    expect(withInfo.categories.SEO).toBe(baseline.categories.SEO);
  });

  it("applies the legacy severity contract in every category", () => {
    const categories: FindingCategory[] = ["SEO", "PERFORMANCE", "SECURITY", "UX", "ACCESSIBILITY", "RESILIENCE"];
    const expected = { CRITICAL: 0, HIGH: 40, MEDIUM: 68, LOW: 88, INFO: 100 } as const;
    for (const category of categories) {
      for (const [severity, score] of Object.entries(expected)) {
        expect(calculateScore([makeFinding(category, severity as FindingSeverity)]).categories[category]).toBe(score);
      }
    }
  });

  it("is symmetric for removing findings", () => {
    const withFindings = calculateScore([makeFinding("SEO", "HIGH"), makeFinding("SECURITY", "CRITICAL")]);
    const afterRemoval = calculateScore([makeFinding("SEO", "HIGH")]);
    expect(afterRemoval.overall).toBeGreaterThanOrEqual(withFindings.overall);
    expect(afterRemoval.categories.SECURITY).toBeGreaterThanOrEqual(withFindings.categories.SECURITY);
  });

  it("does not improve overall score when adding a lower-severity finding", () => {
    const criticalOnly = calculateScore([makeFinding("SECURITY", "CRITICAL")]);
    const criticalPlusSeoLow = calculateScore([
      makeFinding("SECURITY", "CRITICAL"),
      makeFinding("SEO", "LOW"),
    ]);
    expect(criticalPlusSeoLow.overall).toBeLessThanOrEqual(criticalOnly.overall);
  });

  it("does not improve a category score when adding a lower-severity finding", () => {
    const criticalOnly = calculateScore([makeFinding("SECURITY", "CRITICAL")]);
    const criticalPlusLow = calculateScore([
      makeFinding("SECURITY", "CRITICAL"),
      makeFinding("SECURITY", "LOW"),
    ]);
    expect(criticalPlusLow.categories.SECURITY).toBeLessThanOrEqual(criticalOnly.categories.SECURITY);
  });

  it("returns 0 for many critical findings", () => {
    const findings = Array.from({ length: 10 }, () => makeFinding("SECURITY", "CRITICAL"));
    const score = calculateScore(findings);
    expect(score.overall).toBe(0);
    expect(score.grade).toBe("CRITICAL");
  });

  it("calculates category scores", () => {
    const findings = [
      makeFinding("SEO", "HIGH"),
      makeFinding("PERFORMANCE", "LOW"),
    ];
    const score = calculateScore(findings);
    expect(score.categories.SEO).toBeLessThan(100);
    expect(score.categories.PERFORMANCE).toBeLessThan(100);
    expect(score.categories.SECURITY).toBe(100);
  });

  it("counts severities correctly", () => {
    const findings = [
      makeFinding("SEO", "HIGH"),
      makeFinding("SEO", "HIGH"),
      makeFinding("PERFORMANCE", "LOW"),
      makeFinding("SECURITY", "CRITICAL"),
    ];
    const score = calculateScore(findings);
    expect(score.severityCounts.HIGH).toBe(2);
    expect(score.severityCounts.LOW).toBe(1);
    expect(score.severityCounts.CRITICAL).toBe(1);
    expect(score.totalFindings).toBe(4);
  });

  it("grades map correctly", () => {
    expect(calculateScore([]).grade).toBe("EXCELLENT");
    const someFindings = Array.from({ length: 3 }, () => makeFinding("SEO", "MEDIUM"));
    const mid = calculateScore(someFindings);
    expect(["GOOD", "NEEDS_WORK"]).toContain(mid.grade);
  });

  it("formatScore returns readable string", () => {
    expect(formatScore(85)).toBe("85/100");
  });

  it("gradeLabel returns Persian labels", () => {
    expect(gradeLabel("EXCELLENT")).toBe("عالی");
    expect(gradeLabel("CRITICAL")).toBe("بحرانی");
  });

  it("categoryLabel returns Persian labels", () => {
    expect(categoryLabel("SEO")).toBe("سئو");
    expect(categoryLabel("SECURITY")).toBe("امنیت");
  });
});
