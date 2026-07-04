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

  it("hash format is salt:hash", () => {
    const hash = hashPassword("test");
    const parts = hash.split(":");
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBe(32);
    expect(parts[1].length).toBe(128);
  });

  it("handles very long password", () => {
    const longPass = "a".repeat(10000);
    const hash = hashPassword(longPass);
    expect(verifyPassword(longPass, hash)).toBe(true);
  });

  it("handles unicode password", () => {
    const unicode = "pässwörd\u00e9\u00e8";
    const hash = hashPassword(unicode);
    expect(verifyPassword(unicode, hash)).toBe(true);
  });

  it("verifyPassword returns false for malformed hash", () => {
    expect(verifyPassword("test", "no-colon")).toBe(false);
    expect(verifyPassword("test", "")).toBe(false);
    expect(verifyPassword("test", ":")).toBe(false);
  });

  it("rejects password with wrong salt but same hash length", () => {
    const hash1 = hashPassword("password1");
    const hash2 = hashPassword("password2");
    const [, hashPart2] = hash2.split(":");
    const salt1 = hash1.split(":")[0];
    const recombined = `${salt1}:${hashPart2}`;
    expect(verifyPassword("password1", recombined)).toBe(false);
  });
});
