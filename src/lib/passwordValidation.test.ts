import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "./passwordValidation";

describe("validatePasswordStrength", () => {
  it("accepts strong password", () => {
    const result = validatePasswordStrength("StrongP4ss!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects short password", () => {
    const result = validatePasswordStrength("Ab1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("8 characters"))).toBe(true);
  });

  it("rejects too long password", () => {
    const result = validatePasswordStrength("A".repeat(129) + "a1");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("128 characters"))).toBe(true);
  });

  it("rejects password without lowercase", () => {
    const result = validatePasswordStrength("NOLOWERCASE1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
  });

  it("rejects password without uppercase", () => {
    const result = validatePasswordStrength("nouppercase1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
  });

  it("rejects password without number", () => {
    const result = validatePasswordStrength("NoNumberHere!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("number"))).toBe(true);
  });

  it("accepts exactly 8 char password meeting all criteria", () => {
    const result = validatePasswordStrength("Abcdef1!");
    expect(result.valid).toBe(true);
  });

  it("accepts exactly 128 char password", () => {
    const pw = "A" + "a".repeat(126) + "1";
    const result = validatePasswordStrength(pw);
    expect(result.valid).toBe(true);
  });
});
