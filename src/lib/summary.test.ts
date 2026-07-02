import { describe, expect, it } from "vitest";
import { buildAuditSummaryV1 } from "./summary";
import { Finding } from "./types";

describe("buildAuditSummaryV1", () => {
  const baseInput = {
    runId: "run-123",
    inputUrl: "https://example.com",
    normalizedUrl: "https://example.com",
    depth: "QUICK" as const,
    durationMs: 5000,
    headers: {} as Record<string, string>,
    resources: [],
    findings: [] as Finding[],
    seo: { title: true, metaDescription: true, canonical: true, openGraph: true },
  };

  it("produces schema v1 summary", () => {
    const summary = buildAuditSummaryV1(baseInput);
    expect(summary.schema).toBe("asdev.audit.summary.v1");
    expect(summary.run.id).toBe("run-123");
    expect(summary.run.status).toBe("SUCCEEDED");
  });

  it("detects present security headers", () => {
    const summary = buildAuditSummaryV1({
      ...baseInput,
      headers: {
        "Content-Security-Policy": "default-src 'self'",
        "Strict-Transport-Security": "max-age=31536000",
        "X-Content-Type-Options": "nosniff",
      },
    });
    expect(summary.security.headers.csp).toBe("present");
    expect(summary.security.headers.hsts).toBe("present");
    expect(summary.security.headers.xContentTypeOptions).toBe("present");
    expect(summary.security.headers.referrerPolicy).toBe("missing");
  });

  it("detects missing security headers", () => {
    const summary = buildAuditSummaryV1({ ...baseInput, headers: {} });
    expect(summary.security.headers.csp).toBe("missing");
    expect(summary.security.headers.hsts).toBe("missing");
  });

  it("detects SEO basics", () => {
    const summary = buildAuditSummaryV1({
      ...baseInput,
      seo: { title: true, metaDescription: true, canonical: true, openGraph: true },
    });
    expect(summary.seoBasics.title).toBe("present");
    expect(summary.seoBasics.metaDescription).toBe("present");
    expect(summary.seoBasics.canonical).toBe("present");
    expect(summary.seoBasics.openGraph).toBe("present");
  });

  it("detects missing SEO basics", () => {
    const summary = buildAuditSummaryV1({
      ...baseInput,
      seo: { title: false, metaDescription: false, canonical: false, openGraph: false },
    });
    expect(summary.seoBasics.title).toBe("missing");
    expect(summary.seoBasics.metaDescription).toBe("missing");
    expect(summary.seoBasics.canonical).toBe("missing");
    expect(summary.seoBasics.openGraph).toBe("missing");
  });

  it("extracts third-party resources", () => {
    const summary = buildAuditSummaryV1({
      ...baseInput,
      resources: [
        { host: "cdn.example.com", url: "https://cdn.example.com/a.js", kind: "script", isThirdParty: true },
        { host: "cdn.example.com", url: "https://cdn.example.com/b.style", kind: "style", isThirdParty: true },
        { host: "example.com", url: "https://example.com/local.js", kind: "script", isThirdParty: false },
      ],
    });
    expect(summary.dependencies.thirdParty.count).toBe(1);
    expect(summary.dependencies.thirdParty.hosts[0].host).toBe("cdn.example.com");
    expect(summary.dependencies.thirdParty.hosts[0].requestCount).toBe(2);
  });

  it("limits top fixes to 3", () => {
    const findings: Finding[] = Array.from({ length: 10 }, (_, i) => ({
      code: "NO_CSP_HEADER" as Finding["code"],
      severity: "HIGH" as const,
      title: `Finding ${i}`,
      recommendation: `Fix ${i}`,
      category: "SECURITY" as const,
      description: "",
    }));
    const summary = buildAuditSummaryV1({ ...baseInput, findings });
    expect(summary.highlights.topFixes.length).toBe(3);
  });
});
