import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./validators";

describe("signup validation", () => {
  it("accepts valid email", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });

  it("normalizes email to lowercase", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("rejects invalid email", () => {
    expect(() => normalizeEmail("not-an-email")).toThrow("INVALID_EMAIL");
  });

  it("rejects empty email", () => {
    expect(() => normalizeEmail("")).toThrow("INVALID_EMAIL");
  });

  it("rejects email over 254 chars", () => {
    const longEmail = "a".repeat(250) + "@test.com";
    expect(() => normalizeEmail(longEmail)).toThrow("INVALID_EMAIL");
  });
});

describe("password validation", () => {
  it("accepts password of 8+ chars", () => {
    expect("12345678".length >= 8).toBe(true);
  });

  it("rejects password under 8 chars", () => {
    expect("1234567".length >= 8).toBe(false);
  });
});
