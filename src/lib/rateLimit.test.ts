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
