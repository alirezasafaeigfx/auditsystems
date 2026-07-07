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
