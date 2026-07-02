import { describe, expect, it } from "vitest";
import { createReportToken } from "./token";

describe("createReportToken", () => {
  it("generates a 32-character hex string", () => {
    const token = createReportToken();
    expect(token).toMatch(/^[a-f0-9]{32}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => createReportToken()));
    expect(tokens.size).toBe(100);
  });

  it("does not contain dashes", () => {
    const token = createReportToken();
    expect(token).not.toContain("-");
  });
});
