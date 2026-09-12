import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AUDIT_INTENT_POLICY,
  buildAuditCtaHref,
  getAllAuditCtas,
  getAuditCta,
  getAuditCtasForSurface,
  getSampleReportCtaIds,
  validateAuditCtaRegistry,
} from "./audit-cta-registry";
import { trackAuditCtaClick } from "./audit-cta-tracking";

vi.mock("./analytics", () => ({
  trackSeoEvent: vi.fn(),
}));

import { trackSeoEvent } from "./analytics";

describe("audit-cta-registry", () => {
  beforeEach(() => {
    vi.mocked(trackSeoEvent).mockClear();
  });

  it("validates every registry entry against its intent policy", () => {
    expect(validateAuditCtaRegistry()).toEqual([]);
  });

  it("documents one owner and destination class for every supported intent", () => {
    for (const entry of getAllAuditCtas()) {
      const policy = AUDIT_INTENT_POLICY[entry.intent];
      expect(policy.owner).toBeTruthy();
      expect(policy.destinationClass).toBeTruthy();
    }
  });

  it("resolves every CTA ID with bilingual labels", () => {
    for (const entry of getAllAuditCtas()) {
      expect(getAuditCta(entry.id)).toEqual(entry);
      expect(entry.label.fa.length).toBeGreaterThan(0);
      expect(entry.label.en.length).toBeGreaterThan(0);
    }
  });

  it("defines sample-report CTAs as distinct user intents", () => {
    const ids = getSampleReportCtaIds();
    expect(ids).toHaveLength(5);

    const intents = ids.map((id) => getAuditCta(id)?.intent);
    expect(intents).toContain("audit_start");
    expect(intents).toContain("pricing_view");
    expect(intents).toContain("signup");
    expect(intents).toContain("professional_review");
  });

  it("routes own-report CTA to the automated audit without a fictional prefill", () => {
    const entry = getAuditCta("sample_report_own_report");
    expect(entry).toBeDefined();
    expect(buildAuditCtaHref(entry!, "fa")).toBe("/audit");
    expect(buildAuditCtaHref(entry!, "en")).toBe("/en/audit");
  });

  it("builds locale-aware pricing and specialist paths", () => {
    const pricing = getAuditCta("sample_report_pricing");
    const specialist = getAuditCta("sample_report_pro_review");
    expect(buildAuditCtaHref(pricing!, "en")).toBe("/en/pricing");
    expect(buildAuditCtaHref(pricing!, "fa")).toBe("/pricing");
    expect(buildAuditCtaHref(specialist!, "en")).toBe("/en/qualification");
    expect(buildAuditCtaHref(specialist!, "fa")).toBe("/qualification");
  });

  it("returns audit_home CTAs for audit form surface", () => {
    const ctas = getAuditCtasForSurface("audit_home");
    expect(ctas.some((cta) => cta.id === "audit_home_sample_report")).toBe(true);
  });

  it("includes pricing_page and intent_router surfaces", () => {
    const pricing = getAuditCtasForSurface("pricing_page");
    expect(pricing.map((cta) => cta.id)).toEqual(
      expect.arrayContaining(["pricing_page_audit_start", "pricing_page_sample_report"])
    );

    expect(getAuditCta("intent_router_audit_start")).toBeDefined();
    expect(getAuditCta("intent_router_toolbox")?.external).toBe(true);
  });

  it("emits seo_cta_click with stable id, intent, surface, and safe destination", () => {
    const entry = getAuditCta("audit_landing_start");
    expect(entry).toBeDefined();

    trackAuditCtaClick(entry!, "fa");

    expect(trackSeoEvent).toHaveBeenCalledWith("seo_cta_click", {
      cta_id: "audit_landing_start",
      intent: "audit_start",
      surface: "audit_landing",
      destination: "/audit",
      locale: "fa",
    });
  });

  it("does not copy legacy prefill URL or sensitive extra fields into analytics", () => {
    const entry = getAuditCta("sample_report_own_report");
    trackAuditCtaClick(entry!, "en", {
      prefillUrl: "https://customer.example.test/private?token=secret",
      extra: {
        intent_router_variant: "audit_first",
        email: "user@example.test",
        token: "secret",
      },
    });

    const payload = vi.mocked(trackSeoEvent).mock.calls[0]?.[1];
    expect(payload?.destination).toBe("/en/audit");
    expect(payload?.intent_router_variant).toBe("audit_first");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("token");
  });

  it("rejects sensitive values hidden behind approved analytics keys", () => {
    const entry = getAuditCta("intent_router_audit_start");
    trackAuditCtaClick(entry!, "fa", {
      extra: {
        intent_router_variant: "user@example.test",
        legacy_event: "https://private.example.test/report?id=customer",
        source: "+989121234567",
      },
    });

    const payload = vi.mocked(trackSeoEvent).mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty("intent_router_variant");
    expect(payload).not.toHaveProperty("legacy_event");
    expect(payload).not.toHaveProperty("source");
  });
});
