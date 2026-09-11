import { describe, expect, it } from "vitest";
import {
  buildAuditCtaHref,
  getAllAuditCtas,
  getAuditCta,
  type AuditCtaEntry,
} from "./audit-cta-registry";
import { INTENT_ROUTER_CTA_MAP } from "./intent-router-cta";

const LOCAL_DESTINATIONS = {
  audit_start: { fa: "/audit", en: "/en/audit" },
  pricing_view: { fa: "/pricing", en: "/en/pricing" },
  signup: { fa: "/signup", en: "/signup" },
  professional_review: { fa: "/qualification", en: "/en/qualification" },
} as const;

describe("AU-04 intent ownership and safe destinations", () => {
  it("keeps each local visitor intent on its documented Audit-owned route", () => {
    for (const [intent, paths] of Object.entries(LOCAL_DESTINATIONS)) {
      const entries = getAllAuditCtas().filter((entry) => entry.intent === intent);
      expect(entries.length, `missing CTA for ${intent}`).toBeGreaterThan(0);

      for (const entry of entries) {
        expect(entry.external, entry.id).not.toBe(true);
        expect(buildAuditCtaHref(entry, "fa"), entry.id).toBe(paths.fa);
        expect(buildAuditCtaHref(entry, "en"), entry.id).toBe(paths.en);
      }
    }
  });

  it("routes implementation support to the verified ASDEV qualification interface", () => {
    const entry = INTENT_ROUTER_CTA_MAP.execution;

    expect(entry.intent).toBe("implementation_enquiry");
    expect(entry.external).toBe(true);

    const fa = new URL(buildAuditCtaHref(entry, "fa"));
    const en = new URL(buildAuditCtaHref(entry, "en"));

    expect(fa.origin).toBe("https://alirezasafaeisystems.ir");
    expect(fa.pathname).toBe("/qualification");
    expect(en.origin).toBe("https://alirezasafaeisystems.ir");
    expect(en.pathname).toBe("/en/qualification");

    for (const url of [fa, en]) {
      const keys = [...url.searchParams.keys()];
      expect(keys).toEqual(expect.arrayContaining(["utm_source", "utm_medium", "utm_campaign", "utm_content"]));
      expect(keys.every((key) => key.startsWith("utm_"))).toBe(true);
    }
  });

  it("never prefills the fictional sample-report URL into a customer journey", () => {
    const ownReport = getAuditCta("sample_report_own_report");
    expect(ownReport).toBeDefined();
    expect(buildAuditCtaHref(ownReport!, "fa")).toBe("/audit");
    expect(buildAuditCtaHref(ownReport!, "en")).toBe("/en/audit");
    expect(buildAuditCtaHref(ownReport!, "fa")).not.toContain("?");
  });

  it("fails closed for an unknown CTA instead of choosing an arbitrary destination", () => {
    expect(getAuditCta("unknown-au04-intent")).toBeUndefined();
  });

  it("strips sensitive query data from same-origin and cross-origin destinations", () => {
    const internal: AuditCtaEntry = {
      id: "test_internal_sensitive",
      intent: "pricing_view",
      surface: "pricing_page",
      label: { fa: "قیمت", en: "Pricing" },
      path: "/pricing?token=secret&email=user%40example.test&url=https%3A%2F%2Fprivate.example.test",
      analyticsEvent: "seo_cta_click",
    };
    const external: AuditCtaEntry = {
      id: "test_external_sensitive",
      intent: "professional_review",
      surface: "sample_report",
      label: { fa: "اجرا", en: "Implementation" },
      path: "https://alirezasafaeisystems.ir/qualification?utm_source=audit&token=secret&email=user%40example.test&report_id=private",
      external: true,
      analyticsEvent: "seo_cta_click",
    };

    expect(buildAuditCtaHref(internal, "fa")).toBe("/pricing");
    expect(buildAuditCtaHref(external, "fa")).toBe("https://alirezasafaeisystems.ir/qualification?utm_source=audit");
  });

  it("does not accept a customer URL through the legacy prefill option", () => {
    const entry = getAuditCta("sample_report_own_report");
    expect(entry).toBeDefined();
    const href = buildAuditCtaHref(entry!, "fa", { prefillUrl: "https://customer.example.test/private?token=secret" });
    expect(href).toBe("/audit");
    expect(href).not.toContain("customer.example.test");
    expect(href).not.toContain("token");
  });

  it("preserves the existing specialist qualification journey", () => {
    const entry = getAuditCta("sample_report_pro_review");
    expect(entry).toBeDefined();
    expect(entry?.intent).toBe("professional_review");
    expect(buildAuditCtaHref(entry!, "fa")).toBe("/qualification");
    expect(buildAuditCtaHref(entry!, "en")).toBe("/en/qualification");
  });
});
