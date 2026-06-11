import * as cheerio from "cheerio";
import { AuditContext, Finding, FindingCode, FindingSeverity } from "./types";

function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function findUrls(resources: AuditContext["resources"], pattern: RegExp): string[] {
  return resources.filter((r) => pattern.test(r.url)).map((r) => r.url);
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
  const inputsWithoutLabels = $("input:not([aria-label]):not([placeholder])").filter(function(this: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const id = $(this).attr("id");
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

function checkStructuredData(html: string): Array<{ code: string; title: string; severity: string; types: string[] }> {
  const $ = cheerio.load(html);
  const issues: Array<{ code: string; title: string; severity: string; types: string[] }> = [];

  // Check for Schema.org structured data
  const schemaScripts = $("script[type='application/ld+json']");
  if (schemaScripts.length === 0) {
    issues.push({
      code: "NO_SCHEMA_ORG",
      title: "No Schema.org structured data found",
      severity: "LOW",
      types: []
    });
  } else {
    const types: string[] = [];
    schemaScripts.each((_i: number, script: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const data = JSON.parse($(script).html() || "{}") as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Array.isArray(data)) {
          data.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (item["@type"]) types.push(item["@type"]);
          });
        } else if (data["@type"]) {
          types.push(data["@type"]);
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    if (types.length > 0) {
      issues.push({
        code: "SCHEMA_ORG_PRESENT",
        title: "Schema.org structured data detected",
        severity: "INFO",
        types: [...new Set(types)]
      });
    }
  }

  return issues;
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
        evidence: { present: false }
      });
    } else if (issue.code === "SCHEMA_ORG_PRESENT") {
      findings.push({
        code: issue.code,
        category: "SEO",
        severity: "INFO",
        title: issue.title,
        recommendation: "Good! Schema.org structured data is present.",
        evidence: { types: issue.types }
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
