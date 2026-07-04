import { describe, expect, it } from "vitest";
import { FREE_PLAN } from "./usage";

describe("FREE_PLAN constants", () => {
  it("has correct limits", () => {
    expect(FREE_PLAN.name).toBe("Free");
    expect(FREE_PLAN.maxProjects).toBe(1);
    expect(FREE_PLAN.maxAuditsPerMonth).toBe(3);
  });
});
