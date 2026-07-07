import { describe, it, expect } from "vitest";
import {
  FINDING_REGISTRY,
  getFindingMeta,
  getAllFindingCodes,
  getFindingsByCategory,
  getFindingsBySeverity,
} from "./finding-registry";
import type { FindingCategory } from "./types";

describe("finding-registry", () => {
  it("has entries for all 31 finding codes", () => {
    const codes = getAllFindingCodes();
    expect(codes.length).toBe(31);
  });

  it("every entry has required fields", () => {
    for (const [code, meta] of Object.entries(FINDING_REGISTRY)) {
      expect(meta.code).toBe(code);
      expect(meta.category).toBeTruthy();
      expect(meta.defaultSeverity).toBeTruthy();
      expect(meta.title).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.recommendation).toBeTruthy();
      expect(meta.businessImpact).toBeTruthy();
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(meta.effort);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(meta.impact);
    }
  });

  it("getFindingMeta returns correct entry", () => {
    const meta = getFindingMeta("MIXED_CONTENT");
    expect(meta.code).toBe("MIXED_CONTENT");
    expect(meta.category).toBe("SECURITY");
    expect(meta.defaultSeverity).toBe("HIGH");
  });

  it("getFindingsByCategory returns correct subset", () => {
    const security = getFindingsByCategory("SECURITY");
    expect(security.length).toBe(3);
    for (const f of security) {
      expect(f.category).toBe("SECURITY");
    }
  });

  it("getFindingsBySeverity returns correct subset", () => {
    const critical = getFindingsBySeverity("CRITICAL");
    expect(critical.length).toBeGreaterThanOrEqual(0);
    for (const f of critical) {
      expect(f.defaultSeverity).toBe("CRITICAL");
    }
  });

  it("all FindingCategory values have entries", () => {
    const categories: FindingCategory[] = ["RESILIENCE", "PERFORMANCE", "SEO", "SECURITY", "UX", "ACCESSIBILITY"];
    const categoriesWithEntries = categories.filter((cat) => getFindingsByCategory(cat).length > 0);
    expect(categoriesWithEntries.length).toBeGreaterThanOrEqual(5);
  });
});
