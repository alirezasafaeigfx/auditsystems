import { describe, expect, it } from "vitest";
import { checkAuthRateLimit, resetAuthRateLimit, getAuthRateLimitConfig } from "./authRateLimit";

describe("authRateLimit", () => {
  it("allows requests within limit", () => {
    resetAuthRateLimit("test:login:user@test.com");
    const result = checkAuthRateLimit("test:login:user@test.com");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("blocks requests after limit", () => {
    resetAuthRateLimit("test:block@test.com");
    const config = getAuthRateLimitConfig();
    for (let i = 0; i < config.maxAttempts; i++) {
      checkAuthRateLimit("test:block@test.com");
    }
    const result = checkAuthRateLimit("test:block@test.com");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after clear", () => {
    resetAuthRateLimit("test:reset@test.com");
    for (let i = 0; i < 15; i++) {
      checkAuthRateLimit("test:reset@test.com");
    }
    resetAuthRateLimit("test:reset@test.com");
    const result = checkAuthRateLimit("test:reset@test.com");
    expect(result.allowed).toBe(true);
  });

  it("different keys are independent", () => {
    resetAuthRateLimit("test:a@test.com");
    resetAuthRateLimit("test:b@test.com");
    for (let i = 0; i < 15; i++) {
      checkAuthRateLimit("test:a@test.com");
    }
    const resultA = checkAuthRateLimit("test:a@test.com");
    const resultB = checkAuthRateLimit("test:b@test.com");
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it("returns correct config", () => {
    const config = getAuthRateLimitConfig();
    expect(config.windowMs).toBeGreaterThan(0);
    expect(config.maxAttempts).toBeGreaterThan(0);
  });
});
