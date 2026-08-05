import { describe, expect, it } from "vitest";
import { applyPerformanceEvidencePolicy } from "./performance-rules";
import { evaluateAuditRules } from "./rules";
import type { AuditContext } from "./types";

function context(): AuditContext {
  return {
    target: {
      normalizedUrl: "https://example.com/",
      origin: "https://example.com",
      host: "example.com",
      protocol: "https:",
      firstPartyHosts: new Set(["example.com"]),
    },
    main: {
      finalUrl: "https://example.com/",
      status: 200,
      headers: {
        "content-security-policy": "default-src 'self'",
        "strict-transport-security": "max-age=31536000",
      },
      html: `<html><head></head><body>${Array.from({ length: 7 }, (_, index) => `<img src="/${index}.jpg">`).join("")}</body></html>`,
      metrics: { responseMs: 2600, ttfbMs: 800 },
    },
    resources: [
      ...Array.from({ length: 60 }, (_, index) => ({
        url: `https://example.com/resource-${index}.js`,
        host: "example.com",
        kind: "script" as const,
        isThirdParty: false,
        inHead: false,
        attrs: {},
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        url: `https://third-party.example/script-${index}.js`,
        host: "third-party.example",
        kind: "script" as const,
        isThirdParty: true,
        inHead: true,
        attrs: {},
      })),
    ],
    seo: { title: true, metaDescription: true, canonical: true, openGraph: true },
  };
}

describe("performance diagnostic finding policy", () => {
  it("does not serialize legacy Core Web Vitals proxy codes or a synthetic good result", () => {
    const ctx = context();
    const findings = applyPerformanceEvidencePolicy(ctx, evaluateAuditRules(ctx));
    const codes = findings.map((finding) => finding.code);

    expect(codes.some((code) => String(code).startsWith("CWV_"))).toBe(false);
    expect(codes).not.toContain("CWV_OVERALL_GOOD_PROXY");
  });

  it("labels local risk indicators as diagnostics rather than CWV measurements", () => {
    const ctx = context();
    const findings = applyPerformanceEvidencePolicy(ctx, evaluateAuditRules(ctx))
      .filter((finding) => String(finding.code).startsWith("PERF_DIAGNOSTIC_"));

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.title).not.toMatch(/Core Web Vitals|Largest Contentful Paint|First Input Delay|Interaction to Next Paint|Cumulative Layout Shift/i);
      expect(finding.evidence).toMatchObject({ evidenceClass: "HEURISTIC" });
      expect(JSON.stringify(finding.evidence)).toContain("not a Core Web Vitals measurement");
    }
  });
});
