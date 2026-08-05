import { describe, expect, it } from "vitest";
import {
  REPORT_SHARE_PASSWORD_MAX_LENGTH,
  hashPassword,
  isReportShareAccessible,
  verifyPassword,
} from "./reportShare";

describe("isReportShareAccessible", () => {
  it("returns false for revoked shares", () => {
    expect(isReportShareAccessible({ revokedAt: new Date(), expiresAt: null })).toBe(false);
  });

  it("returns false for expired shares", () => {
    expect(isReportShareAccessible(
      { revokedAt: null, expiresAt: new Date("2020-01-01T00:00:00.000Z") },
      new Date("2021-01-01T00:00:00.000Z"),
    )).toBe(false);
  });

  it("returns true for active shares", () => {
    expect(isReportShareAccessible({ revokedAt: null, expiresAt: null })).toBe(true);
  });
});

describe("report share passwords", () => {
  it("verifies a valid password asynchronously", async () => {
    const encoded = hashPassword("correct horse battery staple");

    await expect(verifyPassword("correct horse battery staple", encoded)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", encoded)).resolves.toBe(false);
  });

  it("rejects malformed password encodings without invoking an unsafe shape", async () => {
    const validHash = "00".repeat(64);

    await expect(verifyPassword("password", "invalid")).resolves.toBe(false);
    await expect(verifyPassword("password", `salt:${validHash}`)).resolves.toBe(false);
    await expect(verifyPassword("password", `${"0".repeat(31)}:${validHash}`)).resolves.toBe(false);
    await expect(verifyPassword("password", `${"0".repeat(33)}:${validHash}`)).resolves.toBe(false);
    await expect(verifyPassword("password", `${"g".repeat(32)}:${validHash}`)).resolves.toBe(false);
    await expect(verifyPassword("password", `${"0".repeat(32)}:not-hex`)).resolves.toBe(false);
    await expect(verifyPassword("password", `${"0".repeat(32)}:${validHash}:extra`)).resolves.toBe(false);
  });

  it("rejects empty and oversized candidate passwords inside the primitive", async () => {
    const encoded = hashPassword("valid-password");

    await expect(verifyPassword("", encoded)).resolves.toBe(false);
    await expect(verifyPassword("x".repeat(REPORT_SHARE_PASSWORD_MAX_LENGTH + 1), encoded)).resolves.toBe(false);
  });
});
