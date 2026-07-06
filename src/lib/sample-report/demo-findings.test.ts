import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER } from "./types";
import {
  countBySeverity,
  demoFindings,
  getTopUrgentFindings,
  groupFindingsByCategory,
} from "./demo-findings";

describe("demo-findings", () => {
  it("includes evidence, owner, and difficulty on every finding", () => {
    for (const finding of demoFindings) {
      expect(finding.evidence.fa.length).toBeGreaterThan(0);
      expect(finding.evidence.en.length).toBeGreaterThan(0);
      expect(finding.owner).toBeTruthy();
      expect(finding.difficulty).toBeTruthy();
    }
  });

  it("covers required categories", () => {
    const categories = new Set(demoFindings.map((f) => f.category));
    for (const category of CATEGORY_ORDER) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it("returns only CRITICAL and HIGH for top urgent findings", () => {
    const urgent = getTopUrgentFindings(demoFindings, 3);
    expect(urgent.length).toBeLessThanOrEqual(3);
    for (const finding of urgent) {
      expect(["CRITICAL", "HIGH"]).toContain(finding.severity);
    }
  });

  it("groups findings by category without empty groups", () => {
    const groups = groupFindingsByCategory(demoFindings);
    expect(groups.size).toBeGreaterThanOrEqual(6);
    for (const [, group] of groups) {
      expect(group.length).toBeGreaterThan(0);
    }
  });

  it("has at least one CRITICAL finding for demo credibility", () => {
    expect(countBySeverity(demoFindings, "CRITICAL")).toBeGreaterThanOrEqual(1);
  });
});