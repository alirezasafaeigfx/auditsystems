import { describe, expect, it } from "vitest";
import { parseProjectLimitResponse } from "./project-limit-response";

describe("parseProjectLimitResponse", () => {
  it("accepts the actionable quota response contract", () => {
    expect(parseProjectLimitResponse({
      error: "PROJECT_LIMIT_REACHED",
      usage: { current: 1, limit: 3 },
      upgradeUrl: "/app/billing",
    })).toEqual({
      error: "PROJECT_LIMIT_REACHED",
      usage: { current: 1, limit: 3 },
      upgradeUrl: "/app/billing",
    });
  });

  it("preserves over-limit usage after a plan downgrade", () => {
    expect(parseProjectLimitResponse({
      error: "PROJECT_LIMIT_REACHED",
      usage: { current: 3, limit: 1 },
      upgradeUrl: "/app/billing",
    })).toEqual({
      error: "PROJECT_LIMIT_REACHED",
      usage: { current: 3, limit: 1 },
      upgradeUrl: "/app/billing",
    });
  });

  it.each([
    undefined,
    null,
    [],
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 } },
    { error: "PROJECT_LIMIT_REACHED", upgradeUrl: "/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 }, upgradeUrl: "" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: -1, limit: 3 }, upgradeUrl: "/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1.5, limit: 3 }, upgradeUrl: "/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: Number.NaN, limit: 3 }, upgradeUrl: "/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: Number.POSITIVE_INFINITY }, upgradeUrl: "/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 }, upgradeUrl: "https://example.com/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 }, upgradeUrl: "//example.com/app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 }, upgradeUrl: "app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 }, upgradeUrl: " /app/billing" },
    { error: "PROJECT_LIMIT_REACHED", usage: { current: 1, limit: 3 }, upgradeUrl: "/billing" },
    { error: "FORBIDDEN", usage: { current: 1, limit: 3 }, upgradeUrl: "/app/billing" },
  ])("rejects an invalid quota payload", (value) => {
    expect(parseProjectLimitResponse(value)).toBeNull();
  });
});
