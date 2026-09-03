import { describe, expect, it } from "vitest";
import { evaluateAuditRules } from "./rules";
import { AuditContext } from "./types";

describe("evaluateAuditRules", () => {
  const createBaseContext = (overrides?: Partial<AuditContext>): AuditContext => ({
    target: {
      normalizedUrl: "https://example.com",
      origin: "https://example.com",
      host: "example.com",
      protocol: "https:",
      firstPartyHosts: new Set(["example.com"])
    },
    main: {
      finalUrl: "https://example.com",
      status: 200,
      headers: {},
      html: "<html><head></head><body></body></html>",
      metrics: {
        responseMs: 500,
        ttfbMs: 300
      }
    },
    resources: [],
    seo: {
      title: true,
      metaDescription: true,
      canonical: true,
      openGraph: true
    },
    ...overrides
  });

  it("detects third-party fonts", () => {
    const ctx = createBaseContext({
      resources: [
        {
          url: "https://fonts.googleapis.com/css2?family=Roboto",
          host: "fonts.googleapis.com",
          kind: "font",
          isThirdParty: true,
          inHead: true,
          attrs: {}
        }
      ]
    });

    const findings = evaluateAuditRules(ctx);
    const fontFinding = findings.find((f) => f.code === "THIRD_PARTY_FONTS");
    expect(fontFinding).toBeDefined();
    expect(fontFinding?.category).toBe("RESILIENCE");
  });

  it("detects blocking third-party scripts in head", () => {
    const ctx = createBaseContext({
      resources: [
        {
          url: "https://analytics.example.com/script.js",
          host: "analytics.example.com",
          kind: "script",
          isThirdParty: true,
          inHead: true,
          attrs: {}
        }
      ]
    });

    const findings = evaluateAuditRules(ctx);
    const scriptFinding = findings.find((f) => f.code === "THIRD_PARTY_CRITICAL_JS");
    expect(scriptFinding).toBeDefined();
  });

  it("detects missing CSP header", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const cspFinding = findings.find((f) => f.code === "NO_CSP_HEADER");
    expect(cspFinding).toBeDefined();
  });

  it("does not report CSP when present", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: { "content-security-policy": "default-src 'self'" },
        html: "<html></html>",
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const cspFinding = findings.find((f) => f.code === "NO_CSP_HEADER");
    expect(cspFinding).toBeUndefined();
  });

  it("detects missing HSTS header", () => {
    const ctx = createBaseContext({
      target: {
        normalizedUrl: "https://example.com",
        origin: "https://example.com",
        host: "example.com",
        protocol: "https:",
        firstPartyHosts: new Set(["example.com"])
      },
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const hstsFinding = findings.find((f) => f.code === "NO_HSTS");
    expect(hstsFinding).toBeDefined();
  });

  it("detects slow TTFB", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 2000, ttfbMs: 800 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const ttfbFinding = findings.find((f) => f.code === "SLOW_SERVER_TTFB");
    expect(ttfbFinding).toBeDefined();
  });

  it("detects images without alt text", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><img src="test.jpg"></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const altFinding = findings.find((f) => f.code === "IMG_MISSING_ALT");
    expect(altFinding).toBeDefined();
    expect(altFinding?.category).toBe("ACCESSIBILITY");
  });

  it("detects a verified missing robots.txt", () => {
    const ctx = createBaseContext({
      seoFiles: {
        robots: { url: "https://example.com/robots.txt", status: "MISSING", httpStatus: 404 },
        sitemap: { url: "https://example.com/sitemap.xml", status: "VERIFIED", httpStatus: 200 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const robotsFinding = findings.find((f) => f.code === "NO_ROBOTS_TXT");
    expect(robotsFinding).toBeDefined();
    expect(robotsFinding?.category).toBe("SEO");
  });

  it("detects a verified missing sitemap", () => {
    const ctx = createBaseContext({
      seoFiles: {
        robots: { url: "https://example.com/robots.txt", status: "VERIFIED", httpStatus: 200 },
        sitemap: { url: "https://example.com/sitemap.xml", status: "MISSING", httpStatus: 404 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const sitemapFinding = findings.find((f) => f.code === "NO_SITEMAP");
    expect(sitemapFinding).toBeDefined();
    expect(sitemapFinding?.category).toBe("SEO");
  });

  it("does not infer SEO file absence when the probes are unavailable", () => {
    const ctx = createBaseContext({
      resources: [
        { url: "https://example.com/robots.txt", host: "example.com", kind: "other", isThirdParty: false },
        { url: "https://example.com/sitemap.xml", host: "example.com", kind: "other", isThirdParty: false }
      ],
      seoFiles: {
        robots: { url: "https://example.com/robots.txt", status: "UNAVAILABLE", limitation: "timeout" },
        sitemap: { url: "https://example.com/sitemap.xml", status: "UNAVAILABLE", limitation: "forbidden" }
      }
    });

    const findings = evaluateAuditRules(ctx);
    expect(findings.find((f) => f.code === "NO_ROBOTS_TXT")).toBeUndefined();
    expect(findings.find((f) => f.code === "NO_SITEMAP")).toBeUndefined();
  });

  it("ignores misleading HTML links and trusts verified probe results", () => {
    const ctx = createBaseContext({
      resources: [
        { url: "https://example.com/not-robots.txt", host: "example.com", kind: "other", isThirdParty: false },
        { url: "https://example.com/sitemap-documentation", host: "example.com", kind: "other", isThirdParty: false }
      ],
      seoFiles: {
        robots: { url: "https://example.com/robots.txt", status: "MISSING", httpStatus: 404 },
        sitemap: { url: "https://example.com/sitemap.xml", status: "MISSING", httpStatus: 404 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    expect(findings.find((f) => f.code === "NO_ROBOTS_TXT")).toBeDefined();
    expect(findings.find((f) => f.code === "NO_SITEMAP")).toBeDefined();
  });

  it("detects missing Schema.org structured data", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><h1>Test</h1></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const schemaFinding = findings.find((f) => f.code === "NO_SCHEMA_ORG");
    expect(schemaFinding).toBeDefined();
  });

  it("detects Schema.org structured data when present", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><head><script type="application/ld+json">{"@type":"WebSite","name":"Test"}</script></head><body></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const schemaFinding = findings.find((f) => f.code === "SCHEMA_ORG_PRESENT");
    expect(schemaFinding).toBeDefined();
  });

  it("detects form inputs without labels", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><form><input type="text"></form></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const labelFinding = findings.find((f) => f.code === "INPUT_MISSING_LABEL");
    expect(labelFinding).toBeDefined();
    expect(labelFinding?.category).toBe("ACCESSIBILITY");
  });

  it("detects mixed content on HTTPS", () => {
    const ctx = createBaseContext({
      resources: [
        {
          url: "http://insecure.example.com/script.js",
          host: "insecure.example.com",
          kind: "script",
          isThirdParty: true,
          inHead: false,
          attrs: {}
        }
      ]
    });

    const findings = evaluateAuditRules(ctx);
    const mixedContentFinding = findings.find((f) => f.code === "MIXED_CONTENT");
    expect(mixedContentFinding).toBeDefined();
  });

  it("generates multiple findings for complex issues", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><img src="test.jpg"><form><input type="text"></form></body></html>',
        metrics: { responseMs: 2000, ttfbMs: 800 }
      },
      resources: [
        {
          url: "http://insecure.example.com/script.js",
          host: "insecure.example.com",
          kind: "script",
          isThirdParty: true,
          inHead: false,
          attrs: {}
        }
      ]
    });

    const findings = evaluateAuditRules(ctx);
    expect(findings.length).toBeGreaterThan(3);

    const codes = findings.map((f) => f.code);
    expect(codes).toContain("MIXED_CONTENT");
    expect(codes).toContain("IMG_MISSING_ALT");
    expect(codes).toContain("INPUT_MISSING_LABEL");
    expect(codes).toContain("SLOW_SERVER_TTFB");
  });

  it("detects reCAPTCHA dependency", () => {
    const ctx = createBaseContext({
      resources: [
        {
          url: "https://www.google.com/recaptcha/api.js",
          host: "www.google.com",
          kind: "script",
          isThirdParty: true,
          inHead: false,
          attrs: {}
        }
      ]
    });

    const findings = evaluateAuditRules(ctx);
    const recaptchaFinding = findings.find((f) => f.code === "RECAPTCHA_DEPENDENCY");
    expect(recaptchaFinding).toBeDefined();
    expect(recaptchaFinding?.category).toBe("RESILIENCE");
  });

  it("detects non-fingerprinted static assets", () => {
    const ctx = createBaseContext({
      resources: [
        {
          url: "https://example.com/script.js",
          host: "example.com",
          kind: "script",
          isThirdParty: false,
          inHead: false,
          attrs: {}
        }
      ]
    });

    const findings = evaluateAuditRules(ctx);
    const assetFinding = findings.find((f) => f.code === "STATIC_ASSETS_NO_LONG_CACHE");
    expect(assetFinding).toBeDefined();
    expect(assetFinding?.category).toBe("PERFORMANCE");
  });

  it("detects request-heavy pages", () => {
    const resources = Array.from({ length: 85 }, (_, i) => ({
      url: `https://example.com/resource${i}.js`,
      host: "example.com",
      kind: "script" as const,
      isThirdParty: false,
      inHead: false,
      attrs: {}
    }));

    const ctx = createBaseContext({ resources });

    const findings = evaluateAuditRules(ctx);
    const heavyFinding = findings.find((f) => f.code === "TOO_MANY_REQUESTS_OR_HEAVY_PAGE");
    expect(heavyFinding).toBeDefined();
    expect(heavyFinding?.category).toBe("PERFORMANCE");
  });

  it("detects missing SEO basics", () => {
    const ctx = createBaseContext({
      seo: {
        title: false,
        metaDescription: false,
        canonical: false,
        openGraph: false
      }
    });

    const findings = evaluateAuditRules(ctx);
    const seoFinding = findings.find((f) => f.code === "SEO_BASICS_MISSING");
    expect(seoFinding).toBeDefined();
    expect(seoFinding?.category).toBe("SEO");
  });

  it("does not report SEO basics when all present", () => {
    const ctx = createBaseContext({
      seo: {
        title: true,
        metaDescription: true,
        canonical: true,
        openGraph: true
      }
    });

    const findings = evaluateAuditRules(ctx);
    const seoFinding = findings.find((f) => f.code === "SEO_BASICS_MISSING");
    expect(seoFinding).toBeUndefined();
  });

  it("detects slow server response time", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 3500, ttfbMs: 400 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const responseFinding = findings.find((f) => f.code === "SLOW_SERVER_RESPONSE");
    expect(responseFinding).toBeDefined();
    expect(responseFinding?.category).toBe("PERFORMANCE");
  });

  it("detects images with too many empty alt text", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><img src="a.jpg" alt=""><img src="b.jpg" alt=""><img src="c.jpg" alt=""><img src="d.jpg" alt=""><img src="e.jpg" alt=""><img src="f.jpg" alt=""></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const emptyAltFinding = findings.find((f) => f.code === "IMG_EMPTY_ALT_MANY");
    expect(emptyAltFinding).toBeDefined();
  });

  it("handles HSTS only for HTTPS sites", () => {
    const httpCtx = createBaseContext({
      target: {
        normalizedUrl: "http://example.com",
        origin: "http://example.com",
        host: "example.com",
        protocol: "http:",
        firstPartyHosts: new Set(["example.com"])
      },
      main: {
        finalUrl: "http://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(httpCtx);
    const hstsFinding = findings.find((f) => f.code === "NO_HSTS");
    expect(hstsFinding).toBeUndefined();
  });

  it("detects properly labeled form inputs", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><form><label for="email">Email:</label><input type="text" id="email"></form></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const labelFinding = findings.find((f) => f.code === "INPUT_MISSING_LABEL");
    expect(labelFinding).toBeUndefined();
  });

  it("detects inputs with aria-label", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><form><input type="text" aria-label="Search input"></form></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const labelFinding = findings.find((f) => f.code === "INPUT_MISSING_LABEL");
    expect(labelFinding).toBeUndefined();
  });

  it("detects inputs with placeholder", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><form><input type="text" placeholder="Enter text"></form></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const labelFinding = findings.find((f) => f.code === "INPUT_MISSING_LABEL");
    expect(labelFinding).toBeUndefined();
  });

  it("handles structured data with array format", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><head><script type="application/ld+json">[{"@type":"WebSite","name":"Test","url":"https://example.com"},{"@type":"Organization","name":"Org","url":"https://example.com"}]</script></head><body></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const schemaFinding = findings.find((f) => f.code === "SCHEMA_ORG_PRESENT");
    expect(schemaFinding).toBeDefined();
    expect(schemaFinding?.evidence?.types).toEqual(expect.arrayContaining(["WebSite", "Organization"]));
  });

  it("handles invalid structured data JSON gracefully", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><head><script type="application/ld+json">{"invalid": json}</script></head><body></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    // Invalid JSON might not generate any findings or might generate different findings
    // The important thing is that it doesn't crash
    expect(Array.isArray(findings)).toBe(true);
  });

  it("detects poor Core Web Vitals LCP proxy", () => {
    const resources = Array.from({ length: 60 }, (_, i) => ({
      url: `https://example.com/resource${i}.js`,
      host: "example.com",
      kind: "script" as const,
      isThirdParty: false,
      inHead: false,
      attrs: {}
    }));

    const ctx = createBaseContext({
      resources,
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 2500, ttfbMs: 500 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const lcpFinding = findings.find((f) => f.code === "CWV_LCP_POOR_PROXY");
    expect(lcpFinding).toBeDefined();
    expect(lcpFinding?.category).toBe("PERFORMANCE");
  });

  it("detects poor Core Web Vitals FID proxy", () => {
    const blockingScripts = Array.from({ length: 5 }, (_, i) => ({
      url: `https://analytics.example.com/script${i}.js`,
      host: "analytics.example.com",
      kind: "script" as const,
      isThirdParty: true,
      inHead: true,
      attrs: {}
    }));

    const ctx = createBaseContext({
      resources: blockingScripts
    });

    const findings = evaluateAuditRules(ctx);
    const fidFinding = findings.find((f) => f.code === "CWV_FID_POOR_PROXY");
    expect(fidFinding).toBeDefined();
    expect(fidFinding?.category).toBe("PERFORMANCE");
  });

  it("detects poor Core Web Vitals CLS proxy", () => {
    const imagesWithoutDimensions = Array.from({ length: 8 }, (_, i) => ({
      url: `https://example.com/image${i}.jpg`,
      host: "example.com",
      kind: "img" as const,
      isThirdParty: false,
      inHead: false,
      attrs: {} // No width/height
    }));

    const ctx = createBaseContext({
      resources: imagesWithoutDimensions
    });

    const findings = evaluateAuditRules(ctx);
    const clsFinding = findings.find((f) => f.code === "CWV_CLS_POOR_PROXY");
    expect(clsFinding).toBeDefined();
    expect(clsFinding?.category).toBe("PERFORMANCE");
  });

  it("provides overall Core Web Vitals assessment when multiple issues", () => {
    const resources = [
      ...Array.from({ length: 60 }, (_, i) => ({
        url: `https://example.com/resource${i}.js`,
        host: "example.com",
        kind: "script" as const,
        isThirdParty: false,
        inHead: false,
        attrs: {}
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        url: `https://analytics.example.com/script${i}.js`,
        host: "analytics.example.com",
        kind: "script" as const,
        isThirdParty: true,
        inHead: true,
        attrs: {}
      }))
    ];

    const ctx = createBaseContext({
      resources,
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 2500, ttfbMs: 500 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const overallFinding = findings.find((f) => f.code === "CWV_OVERALL_NEEDS_IMPROVEMENT");
    expect(overallFinding).toBeDefined();
    expect(overallFinding?.category).toBe("PERFORMANCE");
  });

  it("reports good Core Web Vitals when metrics are healthy", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: "<html></html>",
        metrics: { responseMs: 1200, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const goodFinding = findings.find((f) => f.code === "CWV_OVERALL_GOOD_PROXY");
    expect(goodFinding).toBeDefined();
    expect(goodFinding?.severity).toBe("INFO");
  });

  it("detects images missing lazy loading", () => {
    const images = Array.from({ length: 8 }, (_, i) => 
      `<img src="image${i}.jpg" alt="Image ${i}">`
    ).join("");
    
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: `<html><body><div>${images}</div></body></html>`,
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const lazyFinding = findings.find((f) => f.code === "IMAGES_MISSING_LAZY_LOADING");
    expect(lazyFinding).toBeDefined();
    expect(lazyFinding?.category).toBe("PERFORMANCE");
  });

  it("detects embed iframes missing lazy loading", () => {
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: '<html><body><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></body></html>',
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const iframeFinding = findings.find((f) => f.code === "IFRAMES_MISSING_LAZY_LOADING");
    expect(iframeFinding).toBeDefined();
    expect(iframeFinding?.category).toBe("PERFORMANCE");
  });

  it("detects scripts missing async/defer", () => {
    const scripts = Array.from({ length: 5 }, (_, i) => 
      `<script src="script${i}.js"></script>`
    ).join("");
    
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: `<html><body>${scripts}</body></html>`,
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const scriptFinding = findings.find((f) => f.code === "SCRIPTS_MISSING_ASYNC_DEFER");
    expect(scriptFinding).toBeDefined();
    expect(scriptFinding?.category).toBe("PERFORMANCE");
  });

  it("recognizes implemented lazy loading", () => {
    const images = Array.from({ length: 3 }, (_, i) => 
      `<img src="image${i}.jpg" loading="lazy" alt="Image ${i}">`
    ).join("");
    
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: `<html><body>${images}</body></html>`,
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const lazyImplemented = findings.find((f) => f.code === "LAZY_LOADING_IMPLEMENTED");
    expect(lazyImplemented).toBeDefined();
    expect(lazyImplemented?.severity).toBe("INFO");
  });

  it("skips above-fold images for lazy loading recommendations", () => {
    const images = Array.from({ length: 8 }, (_, i) => 
      `<img src="image${i}.jpg" alt="Image ${i}">`
    ).join("");
    
    const ctx = createBaseContext({
      main: {
        finalUrl: "https://example.com",
        status: 200,
        headers: {},
        html: `<html><header>${images}</header><body></body></html>`,
        metrics: { responseMs: 500, ttfbMs: 300 }
      }
    });

    const findings = evaluateAuditRules(ctx);
    const lazyFinding = findings.find((f) => f.code === "IMAGES_MISSING_LAZY_LOADING");
    expect(lazyFinding).toBeUndefined();
  });
});
