import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildAuditCtaHref,
  getAllAuditCtas,
  getAuditCta,
  getAuditCtasForSurface,
  getSampleReportCtaIds,
  validateAuditCtaRegistry,
} from "./audit-cta-registry";
import { trackAuditCtaClick } from "./audit-cta-tracking";
import { SAMPLE_DEMO_URL } from "./sample-report/demo-findings";

vi.mock("./analytics", () => ({
  trackSeoEvent: vi.fn(),
}));

import { trackSeoEvent } from "./analytics";

describe("audit-cta-registry", () => {
  beforeEach(() => {
    vi.mocked(trackSeoEvent).mockClear();
  });

  it("validates every registry entry without errors", () => {
    expect(validateAuditCtaRegistry()).toEqual([]);
  });

  it("resolves every CTA ID with bilingual labels", () => {
    for (const entry of getAllAuditCtas()) {
      expect(getAuditCta(entry.id)).toEqual(entry);
      expect(entry.label.fa.length).toBeGreaterThan(0);
      expect(entry.label.en.length).toBeGreaterThan(0);
    }
  });

  it("defines all sample_report surface CTAs with clear intents", () => {
    const ids = getSampleReportCtaIds();
    expect(ids).toHaveLength(5);

    const intents = ids.map((id) => getAuditCta(id)?.intent);
    expect(intents).toContain("audit_start");
    expect(intents).toContain("pricing_view");
    expect(intents).toContain("signup");
    expect(intents).toContain("professional_review");
  });

  it("builds audit prefill href for own-report CTA", () => {
    const entry = getAuditCta("sample_report_own_report");
    expect(entry).toBeDefined();
    const href = buildAuditCtaHref(entry!, "fa");
    expect(href).toContain("/audit?url=");
    expect(href).toContain(encodeURIComponent(SAMPLE_DEMO_URL));
  });

  it("builds locale-aware internal paths", () => {
    const entry = getAuditCta("sample_report_pricing");
    expect(buildAuditCtaHref(entry!, "en")).toBe("/en/pricing");
    expect(buildAuditCtaHref(entry!, "fa")).toBe("/pricing");
  });

  it("marks professional review as external with UTM params", () => {
    const entry = getAuditCta("sample_report_pro_review");
    expect(entry?.external).toBe(true);
    expect(entry?.path).toContain("utm_source=audit");
    expect(entry?.path).toContain("utm_medium=cta_registry");
  });

  it("returns audit_home CTAs for audit form surface", () => {
    const ctas = getAuditCtasForSurface("audit_home");
    expect(ctas.some((c) => c.id === "audit_home_sample_report")).toBe(true);
  });

  it("includes pricing_page and intent_router surfaces", () => {
    const pricing = getAuditCtasForSurface("pricing_page");
    expect(pricing.map((c) => c.id)).toEqual(
      expect.arrayContaining(["pricing_page_audit_start", "pricing_page_sample_report"])
    );

    expect(getAuditCta("intent_router_audit_start")).toBeDefined();
    expect(getAuditCta("intent_router_toolbox")?.external).toBe(true);
  });

  it("emits seo_cta_click with stable id, intent, surface, and destination", () => {
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

  it("includes prefill destination in click payload when configured", () => {
    const entry = getAuditCta("sample_report_own_report");
    trackAuditCtaClick(entry!, "en");

    const payload = vi.mocked(trackSeoEvent).mock.calls[0]?.[1];
    expect(payload?.destination).toContain("/en/audit?url=");
    expect(String(payload?.destination)).toContain(encodeURIComponent(SAMPLE_DEMO_URL));
  });
});