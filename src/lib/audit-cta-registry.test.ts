import { describe, expect, it } from "vitest";
import {
  buildAuditCtaHref,
  getAllAuditCtas,
  getAuditCta,
  getAuditCtasForSurface,
  getSampleReportCtaIds,
} from "./audit-cta-registry";
import { SAMPLE_DEMO_URL } from "./sample-report/demo-findings";

describe("audit-cta-registry", () => {
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

  it("keeps registry small and practical", () => {
    expect(getAllAuditCtas().length).toBeLessThanOrEqual(12);
  });
});