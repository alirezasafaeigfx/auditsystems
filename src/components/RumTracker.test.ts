import { describe, expect, it } from "vitest";
import { formatRumMetricValue } from "./RumTracker";

describe("RUM metric units", () => {
  it("keeps CLS unitless and rounds timing metrics in milliseconds", () => {
    expect(formatRumMetricValue("CLS", 0.12345)).toBe(0.1235);
    expect(formatRumMetricValue("LCP", 2500.126)).toBe(2500.13);
  });
});
