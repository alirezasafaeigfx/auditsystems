import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createReportAccessCredential,
  getReportAccessCookieName,
  serializeReportAccessCookie,
  verifyReportAccessCredential,
} from "./report-access";

describe("report access credentials", () => {
  beforeEach(() => {
    vi.stubEnv("REPORT_ACCESS_SECRET", "synthetic-report-access-secret-for-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("authorizes only the report bound to an unexpired credential", () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const credential = createReportAccessCredential("report-a", now);

    expect(verifyReportAccessCredential(credential, "report-a", now)).toBe(true);
    expect(verifyReportAccessCredential(credential, "report-b", now)).toBe(false);
    expect(verifyReportAccessCredential(credential, "report-a", new Date(now.getTime() + 15 * 60 * 1000 + 1))).toBe(false);
  });

  it.each(["", "malformed", "v1.bad.bad", "v2.payload.signature"])(
    "rejects absent or malformed credential %j",
    (credential) => {
      expect(verifyReportAccessCredential(credential, "report-a")).toBe(false);
    },
  );

  it("fails closed when the signing secret is unavailable", () => {
    vi.stubEnv("REPORT_ACCESS_SECRET", "");

    expect(() => createReportAccessCredential("report-a")).toThrow(/REPORT_ACCESS_SECRET/);
    expect(verifyReportAccessCredential("anything", "report-a")).toBe(false);
  });

  it("fails closed when the signing secret is too short", () => {
    vi.stubEnv("REPORT_ACCESS_SECRET", "short-secret");

    expect(() => createReportAccessCredential("report-a")).toThrow(/32 bytes/);
    expect(verifyReportAccessCredential("anything", "report-a")).toBe(false);
  });

  it("serializes a report-bound cookie without exposing the raw report token", () => {
    const credential = createReportAccessCredential("raw-sensitive-report-token");
    const cookie = serializeReportAccessCookie("raw-sensitive-report-token", credential, false);

    expect(getReportAccessCookieName("raw-sensitive-report-token")).toMatch(/^report_access_[a-f0-9]{24}$/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=900");
    expect(cookie).not.toContain("raw-sensitive-report-token");
  });
});
