import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("password hashing", () => {
  it("hashes and verifies password correctly", () => {
    const password = "test-password-123";
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("rejects wrong password", () => {
    const hash = hashPassword("correct-password");
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for same password (different salts)", () => {
    const hash1 = hashPassword("same-password");
    const hash2 = hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string password", () => {
    const hash = hashPassword("");
    expect(verifyPassword("", hash)).toBe(true);
    expect(verifyPassword("x", hash)).toBe(false);
  });
});
