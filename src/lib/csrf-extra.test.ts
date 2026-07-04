import { describe, expect, it } from "vitest";
import {
  generateCSRFToken,
  verifyCSRFToken,
  csrfProtection,
} from "./csrf";

const TEST_SECRET = "test-csrf-secret-key-123";

describe("csrfProtection — empty secret skips check", () => {
  it("returns valid when CSRF_SECRET is empty string", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
    });
    const result = await csrfProtection(request, { secret: "" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when secret option is undefined", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
    });
    const result = await csrfProtection(request);
    expect(result.valid).toBe(true);
  });
});

describe("csrfProtection — skips safe HTTP methods", () => {
  it("skips HEAD requests", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "HEAD",
    });
    const result = await csrfProtection(request, { secret: TEST_SECRET });
    expect(result.valid).toBe(true);
  });

  it("skips OPTIONS requests", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "OPTIONS",
    });
    const result = await csrfProtection(request, { secret: TEST_SECRET });
    expect(result.valid).toBe(true);
  });

  it("rejects PUT without CSRF token", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "PUT",
    });
    const result = await csrfProtection(request, { secret: TEST_SECRET });
    expect(result.valid).toBe(false);
  });
});

describe("verifyCSRFToken — expired token", () => {
  it("rejects token generated with short expiresIn", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET, expiresIn: 1 });
    const futureNow = Date.now() + 5000;
    const originalDateNow = Date.now;
    Date.now = () => futureNow;
    try {
      expect(verifyCSRFToken(token, { secret: TEST_SECRET, expiresIn: 1 })).toBe(
        false,
      );
    } finally {
      Date.now = originalDateNow;
    }
  });

  it("accepts token within expiry window", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET, expiresIn: 60 });
    expect(verifyCSRFToken(token, { secret: TEST_SECRET, expiresIn: 60 })).toBe(
      true,
    );
  });
});

describe("verifyCSRFToken — tampered base64", () => {
  it("rejects token with corrupted base64 payload", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const tampered = Buffer.from(
      `${parts[0]}:${parts[1]}:0000000000000000000000000000000000000000000000000000000000000000`,
    ).toString("base64");
    expect(verifyCSRFToken(tampered, { secret: TEST_SECRET })).toBe(false);
  });

  it("rejects token with modified timestamp", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const modified = Buffer.from(
      `9999999999999:${parts[1]}:${parts[2]}`,
    ).toString("base64");
    expect(verifyCSRFToken(modified, { secret: TEST_SECRET })).toBe(false);
  });

  it("rejects token with modified random component", () => {
    const token = generateCSRFToken({ secret: TEST_SECRET });
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const modified = Buffer.from(
      `${parts[0]}:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:${parts[2]}`,
    ).toString("base64");
    expect(verifyCSRFToken(modified, { secret: TEST_SECRET })).toBe(false);
  });

  it("rejects completely invalid base64", () => {
    expect(verifyCSRFToken("!!!not-base64!!!", { secret: TEST_SECRET })).toBe(
      false,
    );
  });
});
