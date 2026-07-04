import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "./passwordValidation";

describe("validatePasswordStrength — empty and edge inputs", () => {
  it("rejects empty string", () => {
    const result = validatePasswordStrength("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects single character", () => {
    const result = validatePasswordStrength("a");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("8 characters"))).toBe(true);
  });

  it("rejects 7 character password", () => {
    const result = validatePasswordStrength("Ab1!xxx");
    expect(result.valid).toBe(false);
  });
});

describe("validatePasswordStrength — boundary lengths", () => {
  it("accepts exactly 8 characters meeting all criteria", () => {
    const result = validatePasswordStrength("Aa1!xxxx");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts exactly 128 characters meeting all criteria", () => {
    const middle = "a".repeat(125);
    const pw = `A${middle}1!`;
    expect(pw.length).toBe(128);
    const result = validatePasswordStrength(pw);
    expect(result.valid).toBe(true);
  });

  it("rejects 129 characters", () => {
    const pw = "A" + "a".repeat(126) + "1!";
    expect(pw.length).toBe(129);
    const result = validatePasswordStrength(pw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("128 characters"))).toBe(true);
  });

  it("rejects 9 characters missing uppercase", () => {
    const result = validatePasswordStrength("a1!xxxxx");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
  });
});

describe("validatePasswordStrength — character class requirements", () => {
  it("rejects missing lowercase", () => {
    const result = validatePasswordStrength("ABCDEF1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
  });

  it("rejects missing uppercase", () => {
    const result = validatePasswordStrength("abcdef1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
  });

  it("rejects missing number", () => {
    const result = validatePasswordStrength("Abcdefgh!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("number"))).toBe(true);
  });

  it("accepts password with special characters", () => {
    const result = validatePasswordStrength("Str0ng@#$");
    expect(result.valid).toBe(true);
  });

  it("accepts password with spaces", () => {
    const result = validatePasswordStrength("Pass word1");
    expect(result.valid).toBe(true);
  });

  it("returns all errors when multiple criteria fail", () => {
    const result = validatePasswordStrength("short");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("validatePasswordStrength — unicode characters", () => {
  it("unicode-only lowercase chars do not satisfy ASCII lowercase check", () => {
    const result = validatePasswordStrength("ÜÖÄ12345!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
  });

  it("unicode-only uppercase chars do not satisfy ASCII uppercase check", () => {
    const result = validatePasswordStrength("üßö12345!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
  });

  it("mixed ASCII and unicode passes when all criteria met", () => {
    const result = validatePasswordStrength("ÜnïcödéA1!");
    expect(result.valid).toBe(true);
  });

  it("CJK characters do not satisfy uppercase check alone", () => {
    const result = validatePasswordStrength("パスワードa1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
  });
});

describe("validatePasswordStrength — repeated characters", () => {
  it("accepts all same character meeting length", () => {
    const result = validatePasswordStrength("aaaaaaaA1");
    expect(result.valid).toBe(true);
  });
});
