import { describe, expect, it } from "vitest";

describe("cleanup helpers", () => {
  it("cleanupExpiredSessions is a function", async () => {
    const { cleanupExpiredSessions } = await import("./cleanup");
    expect(typeof cleanupExpiredSessions).toBe("function");
  });

  it("cleanupStaleJobs is a function", async () => {
    const { cleanupStaleJobs } = await import("./cleanup");
    expect(typeof cleanupStaleJobs).toBe("function");
  });
});
