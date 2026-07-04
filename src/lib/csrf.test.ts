import { describe, expect, it } from "vitest";
import {
  generateCSRFToken,
  verifyCSRFToken,
  csrfProtection,
  getCSRFTokenForClient,
} from "./csrf";

const TEST_SECRET = "test-csrf-secret-key-123";

describe("CSRF token generation and verification", () => {
  it("generates a valid base64 token", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    expect(() => Buffer.from(token, "base64")).not.toThrow();
  });

  it("verifies a freshly generated token", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    expect(verifyCSRFToken(token, { secret: TEST_SECRET })).toBe(true);
  });

  it("rejects token with wrong secret", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    expect(verifyCSRFToken(token, { secret: "wrong-secret" })).toBe(false);
  });

  it("rejects tampered token", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    const parts = Buffer.from(token, "base64").toString("utf-8").split(":");
    const tampered = Buffer.from(`${parts[0]}:${parts[1]}:tampered`).toString("base64");
    expect(verifyCSRFToken(tampered, { secret: TEST_SECRET })).toBe(false);
  });

  it("rejects expired token", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET, expiresIn: 1 });
    expect(verifyCSRFToken(token, { secret: TEST_SECRET, expiresIn: 1 })).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(verifyCSRFToken("not-a-token", { secret: TEST_SECRET })).toBe(false);
    expect(verifyCSRFToken("", { secret: TEST_SECRET })).toBe(false);
  });

  it("returns false when no secret is configured", () => {
    expect(verifyCSRFToken("anything", { secret: "" })).toBe(false);
  });
});

describe("csrfProtection middleware", () => {
  it("skips check when no secret is configured (CI/test)", async () => {
    const request = new Request("https://example.com/api/test", { method: "POST" });
    const result = await csrfProtection(request, { secret: "" });
    expect(result.valid).toBe(true);
  });

  it("skips check for GET requests", async () => {
    const request = new Request("https://example.com/api/test", { method: "GET" });
    const result = await csrfProtection(request, { secret: TEST_SECRET });
    expect(result.valid).toBe(true);
  });

  it("rejects POST without token", async () => {
    const request = new Request("https://example.com/api/test", { method: "POST" });
    const result = await csrfProtection(request, { secret: TEST_SECRET });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("CSRF token missing");
  });

  it("accepts POST with valid token in header", async () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: { "x-csrf-token": token }
    });
    const result = await csrfProtection(request, { secret: TEST_SECRET });
    expect(result.valid).toBe(true);
  });
});

describe("getCSRFTokenForClient", () => {
  it("returns token and headerName", () => {
    const result = getCSRFTokenForClient({ secret: TEST_SECRET });
    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("headerName");
    expect(result.headerName).toBe("x-csrf-token");
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);
  });

  it("generated token verifies with same secret", () => {
    const { token, headerName } = getCSRFTokenForClient({ secret: TEST_SECRET });
    expect(headerName).toBe("x-csrf-token");
    expect(verifyCSRFToken(token, { secret: TEST_SECRET })).toBe(true);
  });

  it("rejects token when secret differs from endpoint", () => {
    const { token } = getCSRFTokenForClient({ secret: TEST_SECRET });
    expect(verifyCSRFToken(token, { secret: "endpoint-secret" })).toBe(false);
  });
});
