import { describe, expect, it } from "vitest";
import { getPlanByCode, isPaidPlan, formatPriceToman, PLANS } from "./plans";

describe("getPlanByCode", () => {
  it("returns correct plan for valid code", () => {
    expect(getPlanByCode("free").code).toBe("free");
    expect(getPlanByCode("starter").code).toBe("starter");
    expect(getPlanByCode("pro").code).toBe("pro");
    expect(getPlanByCode("agency").code).toBe("agency");
  });

  it("is case insensitive", () => {
    expect(getPlanByCode("FREE").code).toBe("free");
    expect(getPlanByCode("Starter").code).toBe("starter");
  });

  it("returns free for null/undefined", () => {
    expect(getPlanByCode(null).code).toBe("free");
    expect(getPlanByCode(undefined).code).toBe("free");
  });

  it("returns free for unknown code", () => {
    expect(getPlanByCode("unknown").code).toBe("free");
  });
});

describe("isPaidPlan", () => {
  it("returns false for free", () => {
    expect(isPaidPlan("free")).toBe(false);
  });

  it("returns true for paid plans", () => {
    expect(isPaidPlan("starter")).toBe(true);
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("agency")).toBe(true);
  });
});

describe("formatPriceToman", () => {
  it("returns Free for 0", () => {
    expect(formatPriceToman(0)).toBe("Free");
  });

  it("formats price with toman", () => {
    const result = formatPriceToman(290000);
    expect(result).toContain("تومان");
  });
});

describe("plans additional functions", () => {
  it("all plans have priceMonthlyToman", () => {
    for (const plan of Object.values(PLANS)) {
      expect(typeof plan.priceMonthlyToman).toBe("number");
      expect(plan.priceMonthlyToman).toBeGreaterThanOrEqual(0);
    }
  });

  it("free plan is 0 toman", () => {
    expect(PLANS.free.priceMonthlyToman).toBe(0);
  });

  it("paid plans have positive prices", () => {
    expect(PLANS.starter.priceMonthlyToman).toBeGreaterThan(0);
    expect(PLANS.pro.priceMonthlyToman).toBeGreaterThan(0);
    expect(PLANS.agency.priceMonthlyToman).toBeGreaterThan(0);
  });

  it("prices increase from starter to agency", () => {
    expect(PLANS.starter.priceMonthlyToman).toBeLessThan(PLANS.pro.priceMonthlyToman);
    expect(PLANS.pro.priceMonthlyToman).toBeLessThan(PLANS.agency.priceMonthlyToman);
  });
});
