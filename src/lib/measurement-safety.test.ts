import { describe, expect, it } from "vitest";
import { sanitizeMeasurementPath } from "./measurement-safety";

describe("measurement path safety", () => {
  it("removes query data and redacts report tokens in both locales", () => {
    expect(sanitizeMeasurementPath("/audit/r/private-token/success?email=person@example.com"))
      .toBe("/audit/r/:token/success");
    expect(sanitizeMeasurementPath("/en/audit/r/private-token/unlock#details"))
      .toBe("/en/audit/r/:token/unlock");
  });
});
