import { describe, expect, it, vi } from "vitest";

vi.mock("./normalizeAuditTargetUrl", () => ({
  normalizeAuditTargetUrl: vi.fn(async (url: string) => ({
    normalizedUrl: url.startsWith("http") ? url : `https://${url}`,
  })),
}));

describe("validateLeadIntake", () => {
  it("validates required lead qualification fields", async () => {
    const { validateLeadIntake } = await import("./lead-delivery");
    const result = await validateLeadIntake({
      domain: "example.com",
      contact: "Owner@Example.com",
      businessType: "ecommerce",
      primaryConcern: "Mobile pages feel slow and organic leads dropped.",
      consentPrivacy: true,
      leadSource: "portfolio",
      sourcePlacement: "hero",
      sourceOffer: "request_assessment",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("owner@example.com");
      expect(result.value.normalizedUrl).toBe("https://example.com");
      expect(result.value.leadSource).toBe("portfolio");
    }
  });

  it("requires privacy consent", async () => {
    const { validateLeadIntake } = await import("./lead-delivery");
    const result = await validateLeadIntake({
      domain: "example.com",
      contact: "owner@example.com",
      businessType: "agency",
      primaryConcern: "Need a technical audit for a client website.",
      consentPrivacy: false,
    });

    expect(result).toEqual({ ok: false, error: "CONSENT_REQUIRED" });
  });
});
