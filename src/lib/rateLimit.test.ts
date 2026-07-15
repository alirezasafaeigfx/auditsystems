import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isDistributedRateLimitRequired } from "./rateLimit";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("isDistributedRateLimitRequired", () => {
  it("returns false when env var is not set", () => {
    delete process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
    expect(isDistributedRateLimitRequired()).toBe(false);
  });

  it("returns true when set to 'true'", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "true";
    expect(isDistributedRateLimitRequired()).toBe(true);
  });

  it("returns true when set to 'TRUE' (case insensitive)", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "TRUE";
    expect(isDistributedRateLimitRequired()).toBe(true);
  });

  it("returns true when set to 'True' mixed case", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "True";
    expect(isDistributedRateLimitRequired()).toBe(true);
  });

  it("returns false when set to 'false'", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "false";
    expect(isDistributedRateLimitRequired()).toBe(false);
  });

  it("returns false when set to random string", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "yes";
    expect(isDistributedRateLimitRequired()).toBe(false);
  });

  it("returns false when set to empty string", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "";
    expect(isDistributedRateLimitRequired()).toBe(false);
  });

  it("returns false when set to whitespace only", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "  ";
    expect(isDistributedRateLimitRequired()).toBe(false);
  });

  it("returns true when set to ' true ' with whitespace", () => {
    process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = " true ";
    expect(isDistributedRateLimitRequired()).toBe(true);
  });
});

describe("F-004: consumeDistributedRateLimit fail-closed behavior", () => {
  it("returns allowed: false when no Redis is configured and NODE_ENV is production", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { consumeDistributedRateLimit } = await import("./rateLimit");
    const result = await consumeDistributedRateLimit({ key: "test:key", limit: 10, windowSec: 60 });
    expect(result.allowed).toBe(false);
    expect(result.backend).toBe("disabled");
  });

  it("returns allowed: true when no Redis is configured and NODE_ENV is development", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { consumeDistributedRateLimit } = await import("./rateLimit");
    const result = await consumeDistributedRateLimit({ key: "test:key", limit: 10, windowSec: 60 });
    expect(result.allowed).toBe(true);
    expect(result.backend).toBe("disabled");
  });
});
