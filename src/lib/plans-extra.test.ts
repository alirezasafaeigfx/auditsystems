import { describe, expect, it } from "vitest";
import { PLANS, getPlanComparison, type PlanCode } from "./plans";

describe("getPlanComparison — data consistency", () => {
  it("returns same data across multiple calls", () => {
    const first = getPlanComparison();
    const second = getPlanComparison();
    expect(first).toEqual(second);
  });

  it("returns exactly 4 plans", () => {
    const comparison = getPlanComparison();
    expect(comparison).toHaveLength(4);
  });

  it("plan names are unique", () => {
    const comparison = getPlanComparison();
    const names = comparison.map((p) => p.plan);
    expect(new Set(names).size).toBe(names.length);
  });

  it("projects values are unique per plan", () => {
    const comparison = getPlanComparison();
    const projects = comparison.map((p) => p.projects);
    expect(new Set(projects).size).toBe(projects.length);
  });

  it("audits values are unique per plan", () => {
    const comparison = getPlanComparison();
    const audits = comparison.map((p) => p.audits);
    expect(new Set(audits).size).toBe(audits.length);
  });
});

describe("PLANS — required fields on all plans", () => {
  const planKeys = Object.keys(PLANS) as PlanCode[];

  it.each(planKeys)("plan '%s' has code field", (code) => {
    expect(PLANS[code].code).toBe(code);
  });

  it.each(planKeys)("plan '%s' has a name", (code) => {
    expect(typeof PLANS[code].name).toBe("string");
    expect(PLANS[code].name.length).toBeGreaterThan(0);
  });

  it.each(planKeys)("plan '%s' has projectLimit > 0", (code) => {
    expect(PLANS[code].projectLimit).toBeGreaterThan(0);
  });

  it.each(planKeys)("plan '%s' has monthlyAuditLimit > 0", (code) => {
    expect(PLANS[code].monthlyAuditLimit).toBeGreaterThan(0);
  });

  it.each(planKeys)("plan '%s' has upgradeCta", (code) => {
    expect(typeof PLANS[code].upgradeCta).toBe("string");
    expect(PLANS[code].upgradeCta.length).toBeGreaterThan(0);
  });

  it.each(planKeys)("plan '%s' has billingNote", (code) => {
    expect(typeof PLANS[code].billingNote).toBe("string");
    expect(PLANS[code].billingNote.length).toBeGreaterThan(0);
  });
});

describe("PLANS — plan codes are unique", () => {
  it("each plan has a distinct code", () => {
    const planKeys = Object.keys(PLANS) as PlanCode[];
    const codes = planKeys.map((k) => PLANS[k].code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("PLANS — free plan is cheapest", () => {
  it("free plan has lowest projectLimit", () => {
    const allLimits = Object.values(PLANS).map((p) => p.projectLimit);
    expect(PLANS.free.projectLimit).toBe(Math.min(...allLimits));
  });

  it("free plan has lowest monthlyAuditLimit", () => {
    const allLimits = Object.values(PLANS).map((p) => p.monthlyAuditLimit);
    expect(PLANS.free.monthlyAuditLimit).toBe(Math.min(...allLimits));
  });

  it("free plan has fewest features enabled", () => {
    const freeFeatureCount =
      (PLANS.free.pdfExport ? 1 : 0) + (PLANS.free.scheduledAudits ? 1 : 0);
    for (const p of Object.values(PLANS)) {
      const count = (p.pdfExport ? 1 : 0) + (p.scheduledAudits ? 1 : 0);
      expect(count).toBeGreaterThanOrEqual(freeFeatureCount);
    }
  });
});

describe("getPlanComparison — ordering", () => {
  it("projects increase from plan 0 to plan 2", () => {
    const comparison = getPlanComparison();
    for (let i = 1; i < comparison.length; i++) {
      expect(comparison[i].projects).toBeGreaterThan(comparison[i - 1].projects);
    }
  });

  it("audits increase from plan 0 to plan 2", () => {
    const comparison = getPlanComparison();
    for (let i = 1; i < comparison.length; i++) {
      expect(comparison[i].audits).toBeGreaterThan(comparison[i - 1].audits);
    }
  });
});
