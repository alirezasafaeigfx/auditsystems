import { describe, expect, it } from "vitest";
import {
  createDownloadToken,
  getDownloadCookieName,
  readDownloadTokenCookie,
  serializeDownloadTokenCookie,
  verifyDownloadToken,
} from "./downloadToken";

describe("downloadToken", () => {
  it("creates and verifies token", () => {
    const token = createDownloadToken({ runId: "run_1", orderId: "ord_1", email: "u@example.com", ttlSec: 60 });
    const payload = verifyDownloadToken(token);
    expect(payload?.runId).toBe("run_1");
    expect(payload?.orderId).toBe("ord_1");
    expect(payload?.email).toBe("u@example.com");
  });

  it("rejects tampered token", () => {
    const token = createDownloadToken({ runId: "run_1", orderId: "ord_1", email: "u@example.com", ttlSec: 60 });
    const tampered = `${token}x`;
    expect(verifyDownloadToken(tampered)).toBeNull();
  });

  it("stores download authorization in a secure report-bound cookie without the report token", () => {
    const token = createDownloadToken({ runId: "run_1", orderId: "ord_1", email: "synthetic@example.invalid", ttlSec: 60 });
    const cookie = serializeDownloadTokenCookie("raw-report-token", token, false);

    expect(getDownloadCookieName("raw-report-token")).toMatch(/^report_download_[a-f0-9]{24}$/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("raw-report-token");
    expect(readDownloadTokenCookie(cookie, "raw-report-token")).toBe(token);
    expect(readDownloadTokenCookie(cookie, "different-report")).toBeNull();
  });
});
