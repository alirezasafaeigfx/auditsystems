import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN, getPlan } from "./usage";

describe("usage helpers", () => {
  it("DEFAULT_PLAN is free", () => {
    expect(DEFAULT_PLAN.code).toBe("free");
    expect(DEFAULT_PLAN.name).toBe("Free");
  });

  it("getPlan returns free plan", () => {
    const plan = getPlan("free");
    expect(plan.projectLimit).toBe(1);
    expect(plan.monthlyAuditLimit).toBe(3);
  });

  it("getPlan falls back to free for unknown", () => {
    const plan = getPlan("nonexistent" as "free" | "starter" | "pro");
    expect(plan.code).toBe("free");
  });
});
