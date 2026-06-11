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

  it("detects missing robots.txt", () => {
    const ctx = createBaseContext({
      resources: []
    });

    const findings = evaluateAuditRules(ctx);
    const robotsFinding = findings.find((f) => f.code === "NO_ROBOTS_TXT");
    expect(robotsFinding).toBeDefined();
    expect(robotsFinding?.category).toBe("SEO");
  });

  it("detects missing sitemap", () => {
    const ctx = createBaseContext({
      resources: []
    });

    const findings = evaluateAuditRules(ctx);
    const sitemapFinding = findings.find((f) => f.code === "NO_SITEMAP");
    expect(sitemapFinding).toBeDefined();
    expect(sitemapFinding?.category).toBe("SEO");
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
});
