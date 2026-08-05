import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeDistributedRateLimit: vi.fn(),
}));

vi.mock("./rateLimit", () => ({
  consumeDistributedRateLimit: mocks.consumeDistributedRateLimit,
}));

function request(headers: Record<string, string> = {}) {
  return new Request("https://audit.example.com/api/auth/login", { headers });
}

describe("distributed authentication abuse controls", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("IP_HASH_SALT", "auth-abuse-test-salt-minimum-32-bytes");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_TRUST_PROXY_HEADERS", "false");
    vi.stubEnv("AUTH_CLIENT_IP_HEADER", "");
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      limit: 10,
      resetSec: 900,
      backend: "local-redis",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed in production instead of trusting a spoofed forwarding header", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { enforceAuthAbuseLimit } = await import("./authRateLimit");

    const result = await enforceAuthAbuseLimit({
      action: "user-login",
      subject: "victim@example.com",
      request: request({ "x-forwarded-for": "198.51.100.44" }),
    });

    expect(result).toMatchObject({
      allowed: false,
      reason: "CLIENT_IDENTITY_UNAVAILABLE",
    });
    expect(mocks.consumeDistributedRateLimit).not.toHaveBeenCalled();
  });

  it("accepts only an explicitly configured trusted header and emits opaque keys", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_TRUST_PROXY_HEADERS", "true");
    vi.stubEnv("AUTH_CLIENT_IP_HEADER", "x-forwarded-for");
    const { enforceAuthAbuseLimit } = await import("./authRateLimit");

    const result = await enforceAuthAbuseLimit({
      action: "user-login",
      subject: "Victim@Example.com",
      request: request({ "x-forwarded-for": "198.51.100.44, 10.0.0.3" }),
    });

    expect(result.allowed).toBe(true);
    expect(mocks.consumeDistributedRateLimit).toHaveBeenCalledTimes(2);
    const serialized = JSON.stringify(mocks.consumeDistributedRateLimit.mock.calls);
    expect(serialized).not.toContain("198.51.100.44");
    expect(serialized).not.toContain("victim@example.com");
    for (const [input] of mocks.consumeDistributedRateLimit.mock.calls) {
      expect(input.key).toMatch(/^auth-abuse:user-login:(ip|pair):[a-f0-9]{64}$/);
      expect(input.windowSec).toBeGreaterThan(0);
      expect(input.limit).toBeGreaterThan(0);
    }
  });

  it("does not create a subject-only lock shared by different clients", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_TRUST_PROXY_HEADERS", "true");
    vi.stubEnv("AUTH_CLIENT_IP_HEADER", "x-real-ip");
    const { enforceAuthAbuseLimit } = await import("./authRateLimit");

    await enforceAuthAbuseLimit({
      action: "user-login",
      subject: "victim@example.com",
      request: request({ "x-real-ip": "198.51.100.10" }),
    });
    const firstKeys = mocks.consumeDistributedRateLimit.mock.calls.map(([input]) => input.key);
    mocks.consumeDistributedRateLimit.mockClear();

    await enforceAuthAbuseLimit({
      action: "user-login",
      subject: "victim@example.com",
      request: request({ "x-real-ip": "198.51.100.11" }),
    });
    const secondKeys = mocks.consumeDistributedRateLimit.mock.calls.map(([input]) => input.key);

    expect(firstKeys).toHaveLength(2);
    expect(secondKeys).toHaveLength(2);
    expect(new Set([...firstKeys, ...secondKeys]).size).toBe(4);
    expect([...firstKeys, ...secondKeys].every((key) => !key.includes("subject:"))).toBe(true);
  });

  it("fails closed when the distributed backend is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_TRUST_PROXY_HEADERS", "true");
    vi.stubEnv("AUTH_CLIENT_IP_HEADER", "x-real-ip");
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 10,
      limit: 10,
      resetSec: 900,
      backend: "error",
    });
    const { enforceAuthAbuseLimit } = await import("./authRateLimit");

    const result = await enforceAuthAbuseLimit({
      action: "admin-login",
      subject: "admin",
      request: request({ "x-real-ip": "203.0.113.7" }),
    });

    expect(result).toMatchObject({
      allowed: false,
      reason: "BACKEND_UNAVAILABLE",
      retryAfterSec: 900,
    });
  });

  it("returns the strictest retry window when either distributed window is exhausted", async () => {
    vi.stubEnv("AUTH_TRUST_PROXY_HEADERS", "true");
    vi.stubEnv("AUTH_CLIENT_IP_HEADER", "x-real-ip");
    mocks.consumeDistributedRateLimit
      .mockResolvedValueOnce({
        allowed: true,
        remaining: 20,
        limit: 30,
        resetSec: 120,
        backend: "local-redis",
      })
      .mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetSec: 480,
        backend: "local-redis",
      });
    const { enforceAuthAbuseLimit } = await import("./authRateLimit");

    const result = await enforceAuthAbuseLimit({
      action: "user-login",
      subject: "victim@example.com",
      request: request({ "x-real-ip": "203.0.113.8" }),
    });

    expect(result).toMatchObject({
      allowed: false,
      reason: "RATE_LIMITED",
      retryAfterSec: 480,
    });
  });
});
