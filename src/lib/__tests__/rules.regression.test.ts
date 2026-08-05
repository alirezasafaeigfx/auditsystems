import { describe, expect, it } from "vitest";
import { evaluateAuditRules } from "../rules";
import { FINDING_REGISTRY, getAllFindingCodes } from "../finding-registry";
import type { AuditContext, FindingCode } from "../types";

const HTTPS_BASE: AuditContext = {
  target: {
    normalizedUrl: "https://example.com",
    origin: "https://example.com",
    host: "example.com",
    protocol: "https:",
    firstPartyHosts: new Set(["example.com"]),
  },
  main: {
    finalUrl: "https://example.com",
    status: 200,
    headers: {
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000",
    },
    html: '<html><head></head><body></body></html>',
    metrics: { ttfbMs: 200, responseMs: 800 },
  },
  resources: [],
  seo: { title: true, metaDescription: true, canonical: true, openGraph: true },
};

function ctx(overrides: Partial<AuditContext> = {}): AuditContext {
  return { ...HTTPS_BASE, ...overrides };
}

function main(overrides: Partial<AuditContext["main"]> = {}): AuditContext["main"] {
  return { ...HTTPS_BASE.main, ...overrides };
}

function target(overrides: Partial<AuditContext["target"]> = {}): AuditContext["target"] {
  return { ...HTTPS_BASE.target, ...overrides };
}

function resources(items: AuditContext["resources"]): AuditContext {
  return ctx({ resources: items });
}

function findingCode(f: { code: string }): string {
  return f.code;
}

// ---------------------------------------------------------------------------
// 1. THIRD_PARTY_FONTS  –  RESILIENCE
// ---------------------------------------------------------------------------
describe("THIRD_PARTY_FONTS", () => {
  const code = "THIRD_PARTY_FONTS" as FindingCode;

  it("fires when third-party font resource is present", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://fonts.googleapis.com/css2?family=Roboto", host: "fonts.googleapis.com", kind: "font", isThirdParty: true },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire for first-party font resources", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://example.com/fonts/roboto.woff2", host: "example.com", kind: "font", isThirdParty: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("fires for third-party Google Fonts stylesheet", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://fonts.googleapis.com/css?family=Open+Sans", host: "fonts.googleapis.com", kind: "style", isThirdParty: true },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("category is RESILIENCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("RESILIENCE");
  });
});

// ---------------------------------------------------------------------------
// 2. THIRD_PARTY_CRITICAL_JS  –  RESILIENCE
// ---------------------------------------------------------------------------
describe("THIRD_PARTY_CRITICAL_JS", () => {
  const code = "THIRD_PARTY_CRITICAL_JS" as FindingCode;

  it("fires when third-party blocking script in head", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://analytics.example.com/a.js", host: "analytics.example.com", kind: "script", isThirdParty: true, inHead: true, attrs: {} },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when script has async attribute", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://analytics.example.com/a.js", host: "analytics.example.com", kind: "script", isThirdParty: true, inHead: true, attrs: { async: true } },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire when script has defer attribute", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://analytics.example.com/a.js", host: "analytics.example.com", kind: "script", isThirdParty: true, inHead: true, attrs: { defer: true } },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is RESILIENCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("RESILIENCE");
  });
});

// ---------------------------------------------------------------------------
// 3. RECAPTCHA_DEPENDENCY  –  RESILIENCE
// ---------------------------------------------------------------------------
describe("RECAPTCHA_DEPENDENCY", () => {
  const code = "RECAPTCHA_DEPENDENCY" as FindingCode;

  it("fires when recaptcha URL found", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://www.google.com/recaptcha/api.js", host: "www.google.com", kind: "script", isThirdParty: true, inHead: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire for unrelated Google scripts", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://www.google-analytics.com/analytics.js", host: "www.google-analytics.com", kind: "script", isThirdParty: true, inHead: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is RESILIENCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("RESILIENCE");
  });
});

// ---------------------------------------------------------------------------
// 4. MIXED_CONTENT  –  SECURITY
// ---------------------------------------------------------------------------
describe("MIXED_CONTENT", () => {
  const code = "MIXED_CONTENT" as FindingCode;

  it("fires when HTTP resource loaded on HTTPS page", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "http://cdn.example.com/script.js", host: "cdn.example.com", kind: "script", isThirdParty: true, inHead: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire on HTTP pages (protocol http:)", () => {
    const httpCtx = ctx({
      target: target({ protocol: "http:", normalizedUrl: "http://example.com", origin: "http://example.com" }),
      main: main({ finalUrl: "http://example.com" }),
    });
    httpCtx.resources = [
      { url: "http://cdn.example.com/script.js", host: "cdn.example.com", kind: "script", isThirdParty: true, inHead: false },
    ];
    const result = evaluateAuditRules(httpCtx);
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire when all resources are HTTPS", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://cdn.example.com/script.js", host: "cdn.example.com", kind: "script", isThirdParty: true, inHead: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SECURITY", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SECURITY");
  });
});

// ---------------------------------------------------------------------------
// 5. NO_CSP_HEADER  –  SECURITY
// ---------------------------------------------------------------------------
describe("NO_CSP_HEADER", () => {
  const code = "NO_CSP_HEADER" as FindingCode;

  it("fires when no CSP header", () => {
    const result = evaluateAuditRules(ctx({ main: main({ headers: {} }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when CSP header is present", () => {
    const result = evaluateAuditRules(ctx());
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SECURITY", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SECURITY");
  });
});

// ---------------------------------------------------------------------------
// 6. NO_HSTS  –  SECURITY
// ---------------------------------------------------------------------------
describe("NO_HSTS", () => {
  const code = "NO_HSTS" as FindingCode;

  it("fires when HTTPS page has no HSTS header", () => {
    const result = evaluateAuditRules(ctx({ main: main({ headers: { "content-security-policy": "default-src 'self'" } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when HSTS header is present", () => {
    const result = evaluateAuditRules(ctx());
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire on HTTP pages", () => {
    const httpCtx = ctx({
      target: target({ protocol: "http:", normalizedUrl: "http://example.com", origin: "http://example.com" }),
      main: main({ finalUrl: "http://example.com", headers: {} }),
    });
    const result = evaluateAuditRules(httpCtx);
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SECURITY", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SECURITY");
  });
});

// ---------------------------------------------------------------------------
// 7. STATIC_ASSETS_NO_LONG_CACHE  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("STATIC_ASSETS_NO_LONG_CACHE", () => {
  const code = "STATIC_ASSETS_NO_LONG_CACHE" as FindingCode;

  it("fires when script has no hash in filename", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://example.com/script.js", host: "example.com", kind: "script", isThirdParty: false, inHead: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when all static assets have fingerprinted hashes", () => {
    const result = evaluateAuditRules(
      resources([
        { url: "https://example.com/main.abc12345.js", host: "example.com", kind: "script", isThirdParty: false, inHead: false },
        { url: "https://example.com/style.def67890.css", host: "example.com", kind: "style", isThirdParty: false, inHead: false },
      ])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 8. SLOW_TTFB_OR_SERVER_RESPONSE  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("SLOW_TTFB_OR_SERVER_RESPONSE", () => {
  const code = "SLOW_TTFB_OR_SERVER_RESPONSE" as FindingCode;

  it("fires when ttfbMs exceeds 1200", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 1500, responseMs: 500 } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("fires when responseMs exceeds 2000", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 200, responseMs: 2500 } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when both metrics are within thresholds", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 800, responseMs: 1500 } }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 9. TOO_MANY_REQUESTS_OR_HEAVY_PAGE  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("TOO_MANY_REQUESTS_OR_HEAVY_PAGE", () => {
  const code = "TOO_MANY_REQUESTS_OR_HEAVY_PAGE" as FindingCode;

  it("fires when resource count exceeds 80", () => {
    const res: AuditContext["resources"] = Array.from({ length: 85 }, (_, i) => ({
      url: `https://example.com/r${i}.js`,
      host: "example.com",
      kind: "script" as const,
      isThirdParty: false,
      inHead: false,
    }));
    const result = evaluateAuditRules(resources(res));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when resource count is 80 or fewer", () => {
    const res: AuditContext["resources"] = Array.from({ length: 80 }, (_, i) => ({
      url: `https://example.com/r${i}.js`,
      host: "example.com",
      kind: "script" as const,
      isThirdParty: false,
      inHead: false,
    }));
    const result = evaluateAuditRules(resources(res));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 10. SLOW_SERVER_TTFB  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("SLOW_SERVER_TTFB", () => {
  const code = "SLOW_SERVER_TTFB" as FindingCode;

  it("fires when ttfbMs exceeds 600", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 700, responseMs: 500 } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when ttfbMs is within threshold", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 500, responseMs: 500 } }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 11. SLOW_SERVER_RESPONSE  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("SLOW_SERVER_RESPONSE", () => {
  const code = "SLOW_SERVER_RESPONSE" as FindingCode;

  it("fires when responseMs exceeds 3000", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 300, responseMs: 3500 } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when responseMs is within threshold", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 300, responseMs: 2500 } }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 12. CWV_LCP_POOR_PROXY  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("CWV_LCP_POOR_PROXY", () => {
  const code = "CWV_LCP_POOR_PROXY" as FindingCode;

  it("fires when responseMs > 2000 and resources > 50", () => {
    const res: AuditContext["resources"] = Array.from({ length: 60 }, (_, i) => ({
      url: `https://example.com/r${i}.js`,
      host: "example.com",
      kind: "script" as const,
      isThirdParty: false,
      inHead: false,
    }));
    const result = evaluateAuditRules(ctx({ resources: res, main: main({ metrics: { responseMs: 2500, ttfbMs: 500 } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when responseMs is low", () => {
    const res: AuditContext["resources"] = Array.from({ length: 60 }, (_, i) => ({
      url: `https://example.com/r${i}.js`,
      host: "example.com",
      kind: "script" as const,
      isThirdParty: false,
      inHead: false,
    }));
    const result = evaluateAuditRules(ctx({ resources: res, main: main({ metrics: { responseMs: 1000, ttfbMs: 300 } }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire when resource count is low", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { responseMs: 3000, ttfbMs: 500 } }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 13. CWV_FID_POOR_PROXY  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("CWV_FID_POOR_PROXY", () => {
  const code = "CWV_FID_POOR_PROXY" as FindingCode;

  it("fires when more than 3 blocking third-party scripts in head", () => {
    const res: AuditContext["resources"] = Array.from({ length: 5 }, (_, i) => ({
      url: `https://tracker.example.com/s${i}.js`,
      host: "tracker.example.com",
      kind: "script" as const,
      isThirdParty: true,
      inHead: true,
      attrs: {},
    }));
    const result = evaluateAuditRules(resources(res));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when only 3 or fewer blocking scripts", () => {
    const res: AuditContext["resources"] = Array.from({ length: 3 }, (_, i) => ({
      url: `https://tracker.example.com/s${i}.js`,
      host: "tracker.example.com",
      kind: "script" as const,
      isThirdParty: true,
      inHead: true,
      attrs: {},
    }));
    const result = evaluateAuditRules(resources(res));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 14. CWV_CLS_POOR_PROXY  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("CWV_CLS_POOR_PROXY", () => {
  const code = "CWV_CLS_POOR_PROXY" as FindingCode;

  it("fires when more than 5 images lack width/height", () => {
    const res: AuditContext["resources"] = Array.from({ length: 7 }, (_, i) => ({
      url: `https://example.com/img${i}.jpg`,
      host: "example.com",
      kind: "img" as const,
      isThirdParty: false,
      inHead: false,
      attrs: {},
    }));
    const result = evaluateAuditRules(resources(res));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when images have explicit dimensions", () => {
    const res: AuditContext["resources"] = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/img${i}.jpg`,
      host: "example.com",
      kind: "img" as const,
      isThirdParty: false,
      inHead: false,
      attrs: { width: "300", height: "200" },
    }));
    const result = evaluateAuditRules(resources(res));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 15. CWV_OVERALL_NEEDS_IMPROVEMENT  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("CWV_OVERALL_NEEDS_IMPROVEMENT", () => {
  const code = "CWV_OVERALL_NEEDS_IMPROVEMENT" as FindingCode;

  it("fires when at least one CWV proxy is poor", () => {
    const blockingScripts: AuditContext["resources"] = Array.from({ length: 5 }, (_, i) => ({
      url: `https://tracker.example.com/s${i}.js`,
      host: "tracker.example.com",
      kind: "script" as const,
      isThirdParty: true,
      inHead: true,
      attrs: {},
    }));
    const result = evaluateAuditRules(resources(blockingScripts));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when no CWV proxies are poor", () => {
    const result = evaluateAuditRules(ctx());
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 16. CWV_OVERALL_GOOD_PROXY  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("CWV_OVERALL_GOOD_PROXY", () => {
  const code = "CWV_OVERALL_GOOD_PROXY" as FindingCode;

  it("fires when no poor proxies and responseMs < 1500", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 200, responseMs: 1000 } }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when responseMs >= 1500", () => {
    const result = evaluateAuditRules(ctx({ main: main({ metrics: { ttfbMs: 200, responseMs: 1600 } }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE and severity INFO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
    expect(FINDING_REGISTRY[code].defaultSeverity).toBe("INFO");
  });
});

// ---------------------------------------------------------------------------
// 17. IMAGES_MISSING_LAZY_LOADING  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("IMAGES_MISSING_LAZY_LOADING", () => {
  const code = "IMAGES_MISSING_LAZY_LOADING" as FindingCode;

  it("fires when more than 5 below-fold images lack lazy loading", () => {
    const imgs = Array.from({ length: 7 }, (_, i) => `<img src="img${i}.jpg" alt="img${i}">`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body><div>${imgs}</div></body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when all images have loading=lazy", () => {
    const imgs = Array.from({ length: 7 }, (_, i) => `<img src="img${i}.jpg" alt="img${i}" loading="lazy">`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body><div>${imgs}</div></body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 18. IFRAMES_MISSING_LAZY_LOADING  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("IFRAMES_MISSING_LAZY_LOADING", () => {
  const code = "IFRAMES_MISSING_LAZY_LOADING" as FindingCode;

  it("fires when embed iframe lacks lazy loading", () => {
    const html = '<html><body><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when iframe has loading=lazy", () => {
    const html = '<html><body><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" loading="lazy"></iframe></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire for non-embed iframes", () => {
    const html = '<html><body><iframe src="https://example.com/widget"></iframe></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 19. SCRIPTS_MISSING_ASYNC_DEFER  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("SCRIPTS_MISSING_ASYNC_DEFER", () => {
  const code = "SCRIPTS_MISSING_ASYNC_DEFER" as FindingCode;

  it("fires when more than 3 body scripts lack async/defer", () => {
    const scripts = Array.from({ length: 5 }, (_, i) => `<script src="s${i}.js"></script>`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body>${scripts}</body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when scripts use async or defer", () => {
    const scripts = Array.from({ length: 5 }, (_, i) => `<script src="s${i}.js" async></script>`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body>${scripts}</body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire for module scripts", () => {
    const scripts = Array.from({ length: 5 }, (_, i) => `<script src="s${i}.js" type="module"></script>`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body>${scripts}</body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is PERFORMANCE", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
  });
});

// ---------------------------------------------------------------------------
// 20. LAZY_LOADING_IMPLEMENTED  –  PERFORMANCE
// ---------------------------------------------------------------------------
describe("LAZY_LOADING_IMPLEMENTED", () => {
  const code = "LAZY_LOADING_IMPLEMENTED" as FindingCode;

  it("fires when images are lazy-loaded", () => {
    const imgs = Array.from({ length: 3 }, (_, i) => `<img src="img${i}.jpg" alt="img${i}" loading="lazy">`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body>${imgs}</body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("fires when iframes are lazy-loaded", () => {
    const html = '<html><body><iframe src="https://www.youtube.com/embed/test" loading="lazy"></iframe></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("category is PERFORMANCE and severity INFO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("PERFORMANCE");
    expect(FINDING_REGISTRY[code].defaultSeverity).toBe("INFO");
  });
});

// ---------------------------------------------------------------------------
// 21. SEO_BASICS_MISSING  –  SEO
// ---------------------------------------------------------------------------
describe("SEO_BASICS_MISSING", () => {
  const code = "SEO_BASICS_MISSING" as FindingCode;

  it("fires when title is missing", () => {
    const result = evaluateAuditRules(ctx({ seo: { title: false, metaDescription: true, canonical: true, openGraph: true } }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("fires when openGraph is missing", () => {
    const result = evaluateAuditRules(ctx({ seo: { title: true, metaDescription: true, canonical: true, openGraph: false } }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when all SEO basics present", () => {
    const result = evaluateAuditRules(ctx({ seo: { title: true, metaDescription: true, canonical: true, openGraph: true } }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 22. NO_ROBOTS_TXT  –  SEO
// ---------------------------------------------------------------------------
describe("NO_ROBOTS_TXT", () => {
  const code = "NO_ROBOTS_TXT" as FindingCode;

  it("fires when no robots.txt in resources", () => {
    const result = evaluateAuditRules(ctx({ resources: [] }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when robots.txt is present", () => {
    const result = evaluateAuditRules(
      resources([{ url: "https://example.com/robots.txt", host: "example.com", kind: "other" as const, isThirdParty: false }])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 23. NO_SITEMAP  –  SEO
// ---------------------------------------------------------------------------
describe("NO_SITEMAP", () => {
  const code = "NO_SITEMAP" as FindingCode;

  it("fires when no sitemap in resources", () => {
    const result = evaluateAuditRules(ctx({ resources: [] }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when sitemap is present", () => {
    const result = evaluateAuditRules(
      resources([{ url: "https://example.com/sitemap.xml", host: "example.com", kind: "other" as const, isThirdParty: false }])
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 24. NO_SCHEMA_ORG  –  SEO
// ---------------------------------------------------------------------------
describe("NO_SCHEMA_ORG", () => {
  const code = "NO_SCHEMA_ORG" as FindingCode;

  it("fires when no JSON-LD script tags", () => {
    const result = evaluateAuditRules(ctx({ main: main({ html: '<html><head></head><body></body></html>' }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when JSON-LD is present", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"WebSite","name":"Test"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 25. SCHEMA_ORG_PRESENT  –  SEO
// ---------------------------------------------------------------------------
describe("SCHEMA_ORG_PRESENT", () => {
  const code = "SCHEMA_ORG_PRESENT" as FindingCode;

  it("fires when structured data exists", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"WebSite","name":"Test"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when no structured data", () => {
    const result = evaluateAuditRules(ctx({ main: main({ html: '<html><head></head><body></body></html>' }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO and severity INFO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
    expect(FINDING_REGISTRY[code].defaultSeverity).toBe("INFO");
  });
});

// ---------------------------------------------------------------------------
// 26. SCHEMA_ORG_NO_RECOMMENDED_TYPES  –  SEO
// ---------------------------------------------------------------------------
describe("SCHEMA_ORG_NO_RECOMMENDED_TYPES", () => {
  const code = "SCHEMA_ORG_NO_RECOMMENDED_TYPES" as FindingCode;

  it("fires when schema types exist but none are recommended", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"FAQPage","name":"FAQ"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when WebSite type is present", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"WebSite","name":"Test","url":"https://example.com"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 27. SCHEMA_ORG_ERRORS  –  SEO
// ---------------------------------------------------------------------------
describe("SCHEMA_ORG_ERRORS", () => {
  const code = "SCHEMA_ORG_ERRORS" as FindingCode;

  it("fires when BreadcrumbList is missing itemListElement", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"BreadcrumbList","name":"Nav"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when valid WebSite schema with required props", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"WebSite","name":"Test","url":"https://example.com"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    const errors = result.find((f) => f.code === code);
    expect(errors).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 28. SCHEMA_ORG_WARNINGS  –  SEO
// ---------------------------------------------------------------------------
describe("SCHEMA_ORG_WARNINGS", () => {
  const code = "SCHEMA_ORG_WARNINGS" as FindingCode;

  it("fires when Article schema is missing headline", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"Article","datePublished":"2024-01-01"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("fires when WebSite schema has no name or url", () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"WebSite"}</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when schema is fully valid with all recommended types", () => {
    const html = '<html><head><script type="application/ld+json">[{"@type":"WebSite","name":"Test","url":"https://example.com"},{"@type":"Organization","name":"Org"},{"@type":"BreadcrumbList","itemListElement":[]}]</script></head><body></body></html>';
    const result = evaluateAuditRules(ctx({ main: main({ html }) }));
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is SEO", () => {
    expect(FINDING_REGISTRY[code].category).toBe("SEO");
  });
});

// ---------------------------------------------------------------------------
// 29. IMG_MISSING_ALT  –  ACCESSIBILITY
// ---------------------------------------------------------------------------
describe("IMG_MISSING_ALT", () => {
  const code = "IMG_MISSING_ALT" as FindingCode;

  it("fires when image has no alt attribute", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><img src="test.jpg"></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when image has alt text", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><img src="test.jpg" alt="A test image"></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire for empty alt (decorative images)", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><img src="test.jpg" alt=""></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is ACCESSIBILITY", () => {
    expect(FINDING_REGISTRY[code].category).toBe("ACCESSIBILITY");
  });
});

// ---------------------------------------------------------------------------
// 30. IMG_EMPTY_ALT_MANY  –  ACCESSIBILITY
// ---------------------------------------------------------------------------
describe("IMG_EMPTY_ALT_MANY", () => {
  const code = "IMG_EMPTY_ALT_MANY" as FindingCode;

  it("fires when more than 5 images have empty alt", () => {
    const imgs = Array.from({ length: 7 }, (_, i) => `<img src="img${i}.jpg" alt="">`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body>${imgs}</body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when 5 or fewer images have empty alt", () => {
    const imgs = Array.from({ length: 5 }, (_, i) => `<img src="img${i}.jpg" alt="">`).join("");
    const result = evaluateAuditRules(
      ctx({ main: main({ html: `<html><body>${imgs}</body></html>` }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is ACCESSIBILITY", () => {
    expect(FINDING_REGISTRY[code].category).toBe("ACCESSIBILITY");
  });
});

// ---------------------------------------------------------------------------
// 31. INPUT_MISSING_LABEL  –  ACCESSIBILITY
// ---------------------------------------------------------------------------
describe("INPUT_MISSING_LABEL", () => {
  const code = "INPUT_MISSING_LABEL" as FindingCode;

  it("fires when input has no label, aria-label, or placeholder", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><form><input type="text"></form></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeDefined();
  });

  it("does NOT fire when input has a label element", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><form><label for="email">Email:</label><input type="text" id="email"></form></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire when input has aria-label", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><form><input type="text" aria-label="Search"></form></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("does NOT fire when input has placeholder", () => {
    const result = evaluateAuditRules(
      ctx({ main: main({ html: '<html><body><form><input type="text" placeholder="Enter text"></form></body></html>' }) })
    );
    expect(result.find((f) => f.code === code)).toBeUndefined();
  });

  it("category is ACCESSIBILITY", () => {
    expect(FINDING_REGISTRY[code].category).toBe("ACCESSIBILITY");
  });
});

// ===========================================================================
// CROSS-CUTTING: severity and category consistency with registry
// ===========================================================================
describe("Severity and category consistency with registry", () => {
  it("all 35 finding codes exist in FINDING_REGISTRY", () => {
    const codes = getAllFindingCodes();
    expect(codes.length).toBe(35);
    for (const code of codes) {
      expect(FINDING_REGISTRY[code]).toBeDefined();
    }
  });

  it("every registry code maps to exactly one category", () => {
    const codes = getAllFindingCodes();
    for (const code of codes) {
      const meta = FINDING_REGISTRY[code];
      expect(["RESILIENCE", "PERFORMANCE", "SEO", "SECURITY", "ACCESSIBILITY"]).toContain(meta.category);
    }
  });

  it("every registry code has a valid defaultSeverity", () => {
    const codes = getAllFindingCodes();
    for (const code of codes) {
      const meta = FINDING_REGISTRY[code];
      expect(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(meta.defaultSeverity);
    }
  });

  it("RESILIENCE findings use HIGH/MEDIUM/LOW severity", () => {
    const codes = getAllFindingCodes().filter((c) => FINDING_REGISTRY[c].category === "RESILIENCE");
    for (const code of codes) {
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(FINDING_REGISTRY[code].defaultSeverity);
    }
  });

  it("SECURITY findings use HIGH/MEDIUM severity", () => {
    const codes = getAllFindingCodes().filter((c) => FINDING_REGISTRY[c].category === "SECURITY");
    for (const code of codes) {
      expect(["HIGH", "MEDIUM"]).toContain(FINDING_REGISTRY[code].defaultSeverity);
    }
  });

  it("ACCESSIBILITY findings use HIGH/MEDIUM/LOW severity", () => {
    const codes = getAllFindingCodes().filter((c) => FINDING_REGISTRY[c].category === "ACCESSIBILITY");
    for (const code of codes) {
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(FINDING_REGISTRY[code].defaultSeverity);
    }
  });
});

// ===========================================================================
// EDGE CASES: combined and boundary scenarios
// ===========================================================================
describe("Edge cases", () => {
  it("empty audit context produces expected baseline findings", () => {
    const emptyCtx = ctx({
      resources: [],
      main: main({ html: '<html><head></head><body></body></html>', headers: {}, metrics: undefined }),
      seo: { title: false, metaDescription: false, canonical: false, openGraph: false },
    });
    const result = evaluateAuditRules(emptyCtx);
    const codes = result.map(findingCode);
    expect(codes).toContain("NO_CSP_HEADER");
    expect(codes).toContain("NO_ROBOTS_TXT");
    expect(codes).toContain("NO_SITEMAP");
    expect(codes).toContain("NO_SCHEMA_ORG");
    expect(codes).toContain("SEO_BASICS_MISSING");
    expect(codes).toContain("LAZY_LOADING_IMPLEMENTED");
  });

  it("all findings have code, category, severity, title, recommendation", () => {
    const result = evaluateAuditRules(
      ctx({
        resources: [
          { url: "https://fonts.googleapis.com/css2?family=Roboto", host: "fonts.googleapis.com", kind: "font", isThirdParty: true },
        ],
        main: main({ html: '<html><body><img src="x.jpg"></body></html>', headers: {} }),
      })
    );
    for (const f of result) {
      expect(f.code).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(f.severity).toBeTruthy();
      expect(f.title).toBeTruthy();
      expect(f.recommendation).toBeTruthy();
    }
  });

  it("findings are unique by code (no duplicates for same trigger)", () => {
    const result = evaluateAuditRules(ctx({ main: main({ html: '<html><body></body></html>' }) }));
    const codes = result.map(findingCode);
    const unique = [...new Set(codes)];
    expect(codes.length).toBe(unique.length);
  });
});
