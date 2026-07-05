import { describe, expect, it } from "vitest";
import { PLANS, getPlan, getPlanComparison, type PlanCode } from "./plans";

describe("PLANS config", () => {
  it("has free, starter, pro plans", () => {
    expect(PLANS.free).toBeDefined();
    expect(PLANS.starter).toBeDefined();
    expect(PLANS.pro).toBeDefined();
  });

  it("free plan has correct limits", () => {
    expect(PLANS.free.projectLimit).toBe(1);
    expect(PLANS.free.monthlyAuditLimit).toBe(3);
    expect(PLANS.free.pdfExport).toBe(false);
    expect(PLANS.free.scheduledAudits).toBe(false);
  });

  it("starter plan has correct limits", () => {
    expect(PLANS.starter.projectLimit).toBe(3);
    expect(PLANS.starter.monthlyAuditLimit).toBe(20);
    expect(PLANS.starter.pdfExport).toBe(true);
  });

  it("pro plan has correct limits", () => {
    expect(PLANS.pro.projectLimit).toBe(10);
    expect(PLANS.pro.monthlyAuditLimit).toBe(100);
    expect(PLANS.pro.pdfExport).toBe(true);
    expect(PLANS.pro.scheduledAudits).toBe(true);
  });

  it("plans are ordered by increasing limits", () => {
    expect(PLANS.free.projectLimit).toBeLessThan(PLANS.starter.projectLimit);
    expect(PLANS.starter.projectLimit).toBeLessThan(PLANS.pro.projectLimit);
    expect(PLANS.free.monthlyAuditLimit).toBeLessThan(PLANS.starter.monthlyAuditLimit);
    expect(PLANS.starter.monthlyAuditLimit).toBeLessThan(PLANS.pro.monthlyAuditLimit);
  });
});

describe("getPlan", () => {
  it("returns free plan for free code", () => {
    expect(getPlan("free")).toBe(PLANS.free);
  });

  it("returns starter plan for starter code", () => {
    expect(getPlan("starter")).toBe(PLANS.starter);
  });

  it("returns free plan for unknown code", () => {
    expect(getPlan("unknown" as PlanCode)).toBe(PLANS.free);
  });
});

describe("getPlanComparison", () => {
  it("returns array with 4 plans", () => {
    const comparison = getPlanComparison();
    expect(comparison).toHaveLength(4);
  });

  it("each plan has required fields", () => {
    const comparison = getPlanComparison();
    for (const p of comparison) {
      expect(p.plan).toBeDefined();
      expect(typeof p.projects).toBe("number");
      expect(typeof p.audits).toBe("number");
      expect(typeof p.pdf).toBe("boolean");
      expect(typeof p.scheduled).toBe("boolean");
    }
  });
});
