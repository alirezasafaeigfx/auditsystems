import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateCSRFToken,
  verifyCSRFToken,
  csrfProtection,
} from "./csrf";

const TEST_SECRET = "test-csrf-secret-key-for-testing-only";

describe("CSRF Protection", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    delete process.env.CSRF_SECRET;
  });

  describe("generateCSRFToken + verifyCSRFToken", () => {
    it("generates and verifies a valid token", () => {
      const token = generateCSRFToken({ secret: TEST_SECRET });
      expect(verifyCSRFToken(token, { secret: TEST_SECRET })).toBe(true);
    });

    it("rejects token signed with different secret", () => {
      const token = generateCSRFToken({ secret: TEST_SECRET });
      expect(verifyCSRFToken(token, { secret: "wrong-secret" })).toBe(false);
    });

    it("rejects tampered token", () => {
      const token = generateCSRFToken({ secret: TEST_SECRET });
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      parts[1] = "tampered";
      const tampered = Buffer.from(parts.join(":")).toString("base64");
      expect(verifyCSRFToken(tampered, { secret: TEST_SECRET })).toBe(false);
    });

    it("rejects expired token", () => {
      const token = generateCSRFToken({ secret: TEST_SECRET, expiresIn: 1 });
      const fakeNow = Date.now() + 5000;
      vi.useFakeTimers({ now: fakeNow });
      expect(verifyCSRFToken(token, { secret: TEST_SECRET, expiresIn: 1 })).toBe(false);
      vi.useRealTimers();
    });

    it("rejects empty token", () => {
      expect(verifyCSRFToken("", { secret: TEST_SECRET })).toBe(false);
    });

    it("rejects garbage token", () => {
      expect(verifyCSRFToken("not-a-valid-token", { secret: TEST_SECRET })).toBe(false);
    });
  });

  describe("csrfProtection middleware", () => {
    function makeRequest(method: string, headers: Record<string, string> = {}): Request {
      return new Request("http://localhost/api/test", { method, headers });
    }

    it("skips CSRF for GET requests", async () => {
      const res = await csrfProtection(makeRequest("GET"));
      expect(res.valid).toBe(true);
    });

    it("rejects POST without CSRF token when secret is set", async () => {
      process.env.CSRF_SECRET = TEST_SECRET;
      const res = await csrfProtection(makeRequest("POST"));
      expect(res.valid).toBe(false);
      expect(res.error).toContain("missing");
      delete process.env.CSRF_SECRET;
    });

    it("accepts POST with valid CSRF token", async () => {
      process.env.CSRF_SECRET = TEST_SECRET;
      const token = generateCSRFToken({ secret: TEST_SECRET });
      const res = await csrfProtection(
        makeRequest("POST", { "x-csrf-token": token })
      );
      expect(res.valid).toBe(true);
      delete process.env.CSRF_SECRET;
    });

    it("rejects in production when CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      vi.stubEnv("NODE_ENV", "production");
      const res = await csrfProtection(makeRequest("POST"));
      expect(res.valid).toBe(false);
      expect(res.error).toContain("misconfigured");
    });

    it("allows in non-production when CSRF_SECRET is missing", async () => {
      delete process.env.CSRF_SECRET;
      vi.stubEnv("NODE_ENV", "development");
      const res = await csrfProtection(makeRequest("POST"));
      expect(res.valid).toBe(true);
    });
  });
});
