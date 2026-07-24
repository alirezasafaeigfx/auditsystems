import * as cheerio from "cheerio";
import { AuditContext, Finding, FindingCode, FindingSeverity } from "./types";

function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function findUrls(resources: AuditContext["resources"], pattern: RegExp): string[] {
  return resources.filter((r) => pattern.test(r.url)).map((r) => r.url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkAccessibilityRules(html: string): Array<{ code: string; title: string; severity: FindingSeverity; count: number }> {
  const $ = cheerio.load(html);
  const issues: Array<{ code: string; title: string; severity: FindingSeverity; count: number }> = [];

  // Check for images without alt text
  const imagesWithoutAlt = $("img:not([alt])").length;
  if (imagesWithoutAlt > 0) {
    issues.push({
      code: "IMG_MISSING_ALT",
      title: "Images missing alt text",
      severity: "MEDIUM",
      count: imagesWithoutAlt
    });
  }

  // Check for images with empty alt text (decorative images should have alt="" but may indicate missing content)
  const imagesWithEmptyAlt = $("img[alt='']").length;
  if (imagesWithEmptyAlt > 5) {
    issues.push({
      code: "IMG_EMPTY_ALT_MANY",
      title: "Many images with empty alt text",
      severity: "LOW",
      count: imagesWithEmptyAlt
    });
  }

  // Check for form inputs without labels
  const inputsWithoutLabels = $("input:not([aria-label]):not([placeholder])").filter((_index, element) => {
    const id = $(element).attr("id");
    return !id || $(`label[for="${id}"]`).length === 0;
  }).length;

  if (inputsWithoutLabels > 0) {
    issues.push({
      code: "INPUT_MISSING_LABEL",
      title: "Form inputs missing labels",
      severity: "HIGH",
      count: inputsWithoutLabels
    });
  }

  return issues;
}

function checkStructuredData(html: string): Array<{ code: string; title: string; severity: string; types: string[]; details?: Record<string, unknown> }> {
  const $ = cheerio.load(html);
  const issues: Array<{ code: string; title: string; severity: string; types: string[]; details?: Record<string, unknown> }> = [];

  // Check for Schema.org structured data
  const schemaScripts = $("script[type='application/ld+json']");
  if (schemaScripts.length === 0) {
    issues.push({
      code: "NO_SCHEMA_ORG",
      title: "No Schema.org structured data found",
      severity: "LOW",
      types: [],
      details: { recommendation: "Add basic Schema.org structured data for WebSite, Organization, or WebPage" }
    });
  } else {
    const types: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    schemaScripts.each((_i, script) => {
      try {
        const data: unknown = JSON.parse($(script).html() || "{}");
        const items: unknown[] = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (!isRecord(item)) {
            errors.push("Structured data item must be an object");
            continue;
          }
          const type = item["@type"];
          if (typeof type === "string") {
            types.push(type);
            validateSchemaItem(item, errors, warnings);
          }
        }
      } catch {
        // Invalid JSON, skip
        errors.push("Invalid JSON in structured data script");
      }
    });

    if (types.length > 0) {
      const uniqueTypes = [...new Set(types)];
      issues.push({
        code: "SCHEMA_ORG_PRESENT",
        title: "Schema.org structured data detected",
        severity: "INFO",
        types: uniqueTypes,
        details: {
          count: uniqueTypes.length,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined
        }
      });

      // Check for recommended types
      const recommendedTypes = ["WebSite", "Organization", "WebPage", "Article", "BreadcrumbList"];
      const hasRecommended = uniqueTypes.some((type) => recommendedTypes.includes(type));
      
      if (!hasRecommended) {
        issues.push({
          code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
          title: "Schema.org missing recommended types",
          severity: "LOW",
          types: uniqueTypes,
          details: {
            recommended: recommendedTypes,
            current: uniqueTypes
          }
        });
      }

      // Check for specific SEO-enhanced types
      if (!uniqueTypes.includes("WebSite")) {
        warnings.push("WebSite schema type recommended for sitelinks search");
      }
      if (!uniqueTypes.includes("Organization")) {
        warnings.push("Organization schema type recommended for knowledge panel");
      }
      if (!uniqueTypes.includes("BreadcrumbList")) {
        warnings.push("BreadcrumbList schema type recommended for navigation");
      }

      // Report errors if any
      if (errors.length > 0) {
        issues.push({
          code: "SCHEMA_ORG_ERRORS",
          title: "Schema.org structured data has errors",
          severity: "MEDIUM",
          types: uniqueTypes,
          details: { errors }
        });
      }

      // Report warnings if any
      if (warnings.length > 0) {
        issues.push({
          code: "SCHEMA_ORG_WARNINGS",
          title: "Schema.org structured data has warnings",
          severity: "LOW",
          types: uniqueTypes,
          details: { warnings }
        });
      }
    }
  }

  return issues;
}

/**
 * Validate individual Schema.org item for common issues
 */
function validateSchemaItem(item: Record<string, unknown>, errors: string[], warnings: string[]): void {
  const type = item["@type"];
  if (typeof type !== "string") {
    errors.push("Schema item missing @type property");
    return;
  }

  // Type-specific validation
  switch (type) {
    case "WebSite":
      if (!item.name && !item.url) {
        warnings.push("WebSite schema should have name or url property");
      }
      break;
    case "Organization":
      if (!item.name && !item.url) {
        warnings.push("Organization schema should have name or url property");
      }
      break;
    case "WebPage":
      if (!item.url) {
        warnings.push("WebPage schema should have url property");
      }
      break;
    case "Article":
    case "BlogPosting":
    case "NewsArticle":
      if (!item.headline) {
        warnings.push(`${type} schema should have headline property`);
      }
      if (!item.datePublished) {
        warnings.push(`${type} schema should have datePublished property`);
      }
      break;
    case "BreadcrumbList":
      if (!item.itemListElement || !Array.isArray(item.itemListElement)) {
        errors.push("BreadcrumbList schema requires itemListElement array");
      }
      break;
    case "Product":
      if (!item.name) {
        warnings.push("Product schema should have name property");
      }
      if (!item.offers && !item.price) {
        warnings.push("Product schema should have offers or price property");
      }
      break;
  }
}

export function evaluateAuditRules(ctx: AuditContext): Finding[] {
  const findings: Finding[] = [];

  const thirdPartyFonts = ctx.resources.filter(
    (r) =>
      r.isThirdParty &&
      (r.kind === "font" || r.kind === "style") &&
      /(fonts\.googleapis|fonts\.gstatic|\.woff2?$)/i.test(r.url)
  );

  if (thirdPartyFonts.length > 0) {
    findings.push({
      code: "THIRD_PARTY_FONTS",
      category: "RESILIENCE",
      severity: "HIGH",
      title: "Third-party fonts detected",
      recommendation: "Self-host critical fonts and preload only what is required.",
      evidence: { count: thirdPartyFonts.length, examples: thirdPartyFonts.slice(0, 8).map((x) => x.url) }
    });
  }

  const blockingHeadScripts = ctx.resources.filter(
    (r) =>
      r.kind === "script" &&
      r.isThirdParty &&
      r.inHead === true &&
      r.attrs?.async !== true &&
      r.attrs?.defer !== true
  );

  if (blockingHeadScripts.length > 0) {
    findings.push({
      code: "THIRD_PARTY_CRITICAL_JS",
      category: "RESILIENCE",
      severity: "HIGH",
      title: "Blocking third-party JavaScript in head",
      recommendation: "Use async/defer, load later, or self-host critical scripts.",
      evidence: { count: blockingHeadScripts.length, examples: blockingHeadScripts.slice(0, 8).map((x) => x.url) }
    });
  }

  const recaptchaUrls = findUrls(ctx.resources, /(google\.com\/recaptcha|gstatic\.com\/recaptcha|recaptcha)/i);
  if (recaptchaUrls.length > 0) {
    findings.push({
      code: "RECAPTCHA_DEPENDENCY",
      category: "RESILIENCE",
      severity: "HIGH",
      title: "reCAPTCHA dependency detected",
      recommendation: "Add server-side anti-abuse fallback and graceful degradation path.",
      evidence: { count: recaptchaUrls.length, examples: recaptchaUrls.slice(0, 8) }
    });
  }

  if (ctx.target.protocol === "https:") {
    const mixedContent = ctx.resources.filter((r) => r.url.startsWith("http://"));
    if (mixedContent.length > 0) {
      findings.push({
        code: "MIXED_CONTENT",
        category: "SECURITY",
        severity: "HIGH",
        title: "Mixed content detected",
        recommendation: "Serve all resources over HTTPS and consider upgrade-insecure-requests in CSP.",
        evidence: { count: mixedContent.length, examples: mixedContent.slice(0, 8).map((x) => x.url) }
      });
    }
  }

  if (!getHeader(ctx.main.headers, "content-security-policy")) {
    findings.push({
      code: "NO_CSP_HEADER",
      category: "SECURITY",
      severity: "MEDIUM",
      title: "Missing CSP header",
      recommendation: "Deploy a baseline CSP and tighten progressively.",
      evidence: { header: "content-security-policy", present: false }
    });
  }

  if (ctx.target.protocol === "https:" && !getHeader(ctx.main.headers, "strict-transport-security")) {
    findings.push({
      code: "NO_HSTS",
      category: "SECURITY",
      severity: "MEDIUM",
      title: "Missing HSTS header",
      recommendation: "Enable Strict-Transport-Security with an appropriate max-age.",
      evidence: { header: "strict-transport-security", present: false }
    });
  }

  const staticAssetNoCachePartial = ctx.resources.some(
    (r) => (r.kind === "script" || r.kind === "style") && !/[.-][a-f0-9]{8,}\./i.test(r.url)
  );
  if (staticAssetNoCachePartial) {
    findings.push({
      code: "STATIC_ASSETS_NO_LONG_CACHE",
      category: "PERFORMANCE",
      severity: "LOW",
      title: "Potentially non-fingerprinted static assets",
      recommendation: "Use hashed filenames and long immutable cache-control for static assets.",
      evidence: { partial: true }
    });
  }

  if ((ctx.main.metrics?.ttfbMs ?? 0) > 1200 || (ctx.main.metrics?.responseMs ?? 0) > 2000) {
    findings.push({
      code: "SLOW_TTFB_OR_SERVER_RESPONSE",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Server response appears slow",
      recommendation: "Improve backend response time and caching strategy.",
      evidence: { partial: true, metrics: ctx.main.metrics }
    });
  }

  if (ctx.resources.length > 80) {
    findings.push({
      code: "TOO_MANY_REQUESTS_OR_HEAVY_PAGE",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Page appears request-heavy",
      recommendation: "Reduce request count and payload size for critical rendering path.",
      evidence: { partial: true, resourceCount: ctx.resources.length }
    });
  }

  if (!ctx.seo.title || !ctx.seo.metaDescription || !ctx.seo.canonical || !ctx.seo.openGraph) {
    findings.push({
      code: "SEO_BASICS_MISSING",
      category: "SEO",
      severity: "LOW",
      title: "Basic SEO tags are incomplete",
      recommendation: "Add title, meta description, canonical URL, and Open Graph tags.",
      evidence: { partial: true, seo: ctx.seo }
    });
  }

  // Check accessibility rules
  const accessibilityIssues = checkAccessibilityRules(ctx.main.html);
  for (const issue of accessibilityIssues) {
    findings.push({
      code: issue.code as FindingCode,
      category: "ACCESSIBILITY",
      severity: issue.severity,
      title: issue.title,
      recommendation: getAccessibilityRecommendation(issue.code),
      evidence: { count: issue.count }
    });
  }

  // Check for robots.txt
  const robotsTxtUrl = `${ctx.target.origin}/robots.txt`;
  const hasRobotsTxt = ctx.resources.some((r) => r.url.includes("robots.txt"));
  if (!hasRobotsTxt) {
    findings.push({
      code: "NO_ROBOTS_TXT",
      category: "SEO",
      severity: "LOW",
      title: "robots.txt not found",
      recommendation: "Add a robots.txt file to control search engine crawling.",
      evidence: { url: robotsTxtUrl, present: false }
    });
  }

  // Check for sitemap.xml
  const sitemapUrl = `${ctx.target.origin}/sitemap.xml`;
  const hasSitemap = ctx.resources.some((r) => r.url.includes("sitemap"));
  if (!hasSitemap) {
    findings.push({
      code: "NO_SITEMAP",
      category: "SEO",
      severity: "LOW",
      title: "Sitemap not found",
      recommendation: "Add a sitemap.xml to help search engines discover your content.",
      evidence: { url: sitemapUrl, present: false }
    });
  }

  // Check server response timing (not true Core Web Vitals, just TTFB/response time)
  if (ctx.main.metrics) {
    const { ttfbMs, responseMs } = ctx.main.metrics;

    if (ttfbMs && ttfbMs > 600) {
      findings.push({
        code: "SLOW_SERVER_TTFB",
        category: "PERFORMANCE",
        severity: "HIGH",
        title: "Server Time to First Byte (TTFB) is slow",
        recommendation: "Optimize server response time, use CDN, and reduce backend processing.",
        evidence: { ttfbMs, threshold: 600 }
      });
    }

    if (responseMs && responseMs > 3000) {
      findings.push({
        code: "SLOW_SERVER_RESPONSE",
        category: "PERFORMANCE",
        severity: "HIGH",
        title: "Server response time is slow",
        recommendation: "Reduce page weight, optimize assets, and implement better caching.",
        evidence: { responseMs, threshold: 3000 }
      });
    }
  }

  // Core Web Vitals proxy checks (based on server-side metrics that correlate with CWV)
  checkCoreWebVitalsProxies(ctx, findings);

  // Check for lazy loading implementation
  checkLazyLoading(ctx, findings);

  // Check structured data
  const structuredDataIssues = checkStructuredData(ctx.main.html);
  for (const issue of structuredDataIssues) {
    if (issue.code === "NO_SCHEMA_ORG") {
      findings.push({
        code: issue.code,
        category: "SEO",
        severity: "LOW",
        title: issue.title,
        recommendation: "Add Schema.org structured data to help search engines understand your content.",
        evidence: { present: false, details: issue.details }
      });
    } else if (issue.code === "SCHEMA_ORG_PRESENT") {
      findings.push({
        code: issue.code,
        category: "SEO",
        severity: "INFO",
        title: issue.title,
        recommendation: "Good! Schema.org structured data is present.",
        evidence: { types: issue.types, details: issue.details }
      });
    } else if (issue.code === "SCHEMA_ORG_NO_RECOMMENDED_TYPES") {
      findings.push({
        code: issue.code,
        category: "SEO",
        severity: "LOW",
        title: issue.title,
        recommendation: "Add recommended Schema.org types like WebSite, Organization, or WebPage for better SEO.",
        evidence: { types: issue.types, details: issue.details }
      });
    } else if (issue.code === "SCHEMA_ORG_ERRORS") {
      findings.push({
        code: issue.code,
        category: "SEO",
        severity: "MEDIUM",
        title: issue.title,
        recommendation: "Fix Schema.org structured data errors to ensure proper indexing by search engines.",
        evidence: { types: issue.types, details: issue.details }
      });
    } else if (issue.code === "SCHEMA_ORG_WARNINGS") {
      findings.push({
        code: issue.code,
        category: "SEO",
        severity: "LOW",
        title: issue.title,
        recommendation: "Address Schema.org warnings to maximize SEO benefits.",
        evidence: { types: issue.types, details: issue.details }
      });
    }
  }

  return findings;
}

function getAccessibilityRecommendation(code: string): string {
  const recommendations: Record<string, string> = {
    IMG_MISSING_ALT: "Add descriptive alt text to all images for screen reader users.",
    IMG_EMPTY_ALT_MANY: "Review images with empty alt text - ensure decorative images are properly marked.",
    INPUT_MISSING_LABEL: "Add labels to all form inputs using <label> tags or aria-label attributes."
  };
  return recommendations[code] || "Follow WCAG guidelines for accessibility.";
}

/**
 * Check Core Web Vitals proxies based on server-side metrics
 * These are proxy indicators since we can't measure actual Core Web Vitals server-side
 */
function checkCoreWebVitalsProxies(ctx: AuditContext, findings: Finding[]): void {
  // LCP Proxy: Based on response time and resource count
  if (ctx.main.metrics) {
    const responseTime = ctx.main.metrics.responseMs || 0;
    const resourceCount = ctx.resources.length;
    
    // High response time + many resources likely means slow LCP
    if (responseTime > 2000 && resourceCount > 50) {
      findings.push({
        code: "CWV_LCP_POOR_PROXY",
        category: "PERFORMANCE",
        severity: "HIGH",
        title: "Core Web Vitals: Likely poor Largest Contentful Paint (LCP)",
        recommendation: "Optimize LCP by preloading critical resources, using CDN, optimizing images, and reducing server response time.",
        evidence: { 
          responseTime,
          resourceCount,
          proxy: "Based on server response time and resource count"
        }
      });
    }
  }

  // FID Proxy: Based on blocking scripts and total JS size
  const blockingScripts = ctx.resources.filter(
    (r) => r.kind === "script" && r.isThirdParty && r.inHead && r.attrs?.async !== true && r.attrs?.defer !== true
  );
  
  if (blockingScripts.length > 3) {
    findings.push({
      code: "CWV_FID_POOR_PROXY",
      category: "PERFORMANCE",
      severity: "HIGH",
      title: "Core Web Vitals: Likely poor First Input Delay (FID)",
      recommendation: "Reduce JavaScript execution time, defer non-critical JS, and use code splitting to improve interactivity.",
      evidence: {
        blockingScriptCount: blockingScripts.length,
        proxy: "Based on blocking third-party scripts in head"
      }
    });
  }

  // CLS Proxy: Based on images without dimensions and late-loaded resources
  const imagesWithoutDimensions = ctx.resources.filter(
    (r) => r.kind === "img" && (!r.attrs?.width || !r.attrs?.height)
  );
  
  if (imagesWithoutDimensions.length > 5) {
    findings.push({
      code: "CWV_CLS_POOR_PROXY",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Core Web Vitals: Likely poor Cumulative Layout Shift (CLS)",
      recommendation: "Specify width and height for all images, reserve space for dynamic content, and avoid inserting content above existing content.",
      evidence: {
        imagesWithoutDimensions: imagesWithoutDimensions.length,
        proxy: "Based on images without explicit dimensions"
      }
    });
  }

  // Overall Core Web Vitals assessment
  const poorLCP = findings.some((f) => f.code === "CWV_LCP_POOR_PROXY");
  const poorFID = findings.some((f) => f.code === "CWV_FID_POOR_PROXY");
  const poorCLS = findings.some((f) => f.code === "CWV_CLS_POOR_PROXY");

  if (poorLCP || poorFID || poorCLS) {
    findings.push({
      code: "CWV_OVERALL_NEEDS_IMPROVEMENT",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Core Web Vitals: Overall performance needs improvement",
      recommendation: "Use tools like Lighthouse, PageSpeed Insights, or Web Vitals library to measure actual Core Web Vitals and optimize accordingly.",
      evidence: {
        poorLCP,
        poorFID,
        poorCLS,
        proxy: "Based on server-side proxy metrics"
      }
    });
  } else if (!poorLCP && !poorFID && !poorCLS && ctx.main.metrics?.responseMs && ctx.main.metrics.responseMs < 1500) {
    findings.push({
      code: "CWV_OVERALL_GOOD_PROXY",
      category: "PERFORMANCE",
      severity: "INFO",
      title: "Core Web Vitals: Likely good performance based on proxy metrics",
      recommendation: "Continue monitoring actual Core Web Vitals using RUM (Real User Monitoring) for accurate measurements.",
      evidence: {
        proxy: "Based on server-side proxy metrics",
        responseTime: ctx.main.metrics.responseMs
      }
    });
  }
}

/**
 * Check for lazy loading implementation
 */
function checkLazyLoading(ctx: AuditContext, findings: Finding[]): void {
  const $ = cheerio.load(ctx.main.html);

  // Check images that should have lazy loading but don't
  const images = $("img");
  const imagesWithoutLazy = images.filter((_index, element) => {
    const $img = $(element);
    const loading = $img.attr("loading");
    const isAboveFold = $img.closest("header, hero, .hero, #hero, [role='banner']").length > 0;
    
    // Skip above-fold images for lazy loading recommendation
    if (isAboveFold) return false;
    
    // Images without loading="lazy" attribute (except above-fold)
    return loading !== "lazy";
  });

  if (imagesWithoutLazy.length > 5) {
    findings.push({
      code: "IMAGES_MISSING_LAZY_LOADING",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Images missing lazy loading attribute",
      recommendation: `Add loading="lazy" to ${imagesWithoutLazy.length} below-fold images to improve initial page load performance.`,
      evidence: { count: imagesWithoutLazy.length }
    });
  }

  // Check for iframe lazy loading (e.g., embeds, videos)
  const iframes = $("iframe");
  const iframesWithoutLazy = iframes.filter((_index, element) => {
    const $iframe = $(element);
    const loading = $iframe.attr("loading");
    const src = $iframe.attr("src") || "";
    
    // Skip iframes that are likely above-fold content
    const isAboveFold = $iframe.closest("header, hero, .hero, #hero, [role='banner']").length > 0;
    if (isAboveFold) return false;
    
    // Focus on embed content that should be lazy loaded
    const isEmbedContent = /youtube|vimeo|dailymotion|soundcloud|spotify|twitter|facebook|instagram/i.test(src);
    if (isEmbedContent && loading !== "lazy") {
      return true;
    }
    
    return false;
  });

  if (iframesWithoutLazy.length > 0) {
    findings.push({
      code: "IFRAMES_MISSING_LAZY_LOADING",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Embed iframes missing lazy loading",
      recommendation: `Add loading="lazy" to ${iframesWithoutLazy.length} embed iframes to defer loading of heavy third-party content.`,
      evidence: { count: iframesWithoutLazy.length }
    });
  }

  // Check for scripts that could use async/defer
  const scriptsInBody = $("body script[src]");
  const scriptsWithoutAsyncDefer = scriptsInBody.filter((_index, element) => {
    const $script = $(element);
    const async = $script.attr("async");
    const defer = $script.attr("defer");
    const type = $script.attr("type");
    
    // Skip scripts that are already async/defer or are module type
    if (async || defer || type === "module") return false;
    
    return true;
  });

  if (scriptsWithoutAsyncDefer.length > 3) {
    findings.push({
      code: "SCRIPTS_MISSING_ASYNC_DEFER",
      category: "PERFORMANCE",
      severity: "LOW",
      title: "Scripts missing async or defer attributes",
      recommendation: `Add async or defer attributes to ${scriptsWithoutAsyncDefer.length} body scripts to improve parsing performance.`,
      evidence: { count: scriptsWithoutAsyncDefer.length }
    });
  }

  // Check for native lazy loading support detection
  const hasNativeLazyLoading = imagesWithoutLazy.length === 0 || iframesWithoutLazy.length === 0;
  if (hasNativeLazyLoading) {
    findings.push({
      code: "LAZY_LOADING_IMPLEMENTED",
      category: "PERFORMANCE",
      severity: "INFO",
      title: "Native lazy loading is implemented",
      recommendation: "Good! Native lazy loading helps improve initial page load performance.",
      evidence: { 
        imagesOptimized: imagesWithoutLazy.length === 0,
        iframesOptimized: iframesWithoutLazy.length === 0
      }
    });
  }
}
