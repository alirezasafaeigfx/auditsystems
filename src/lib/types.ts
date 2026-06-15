export type ResourceKind = "script" | "style" | "font" | "img" | "image" | "preload" | "other";

export type ExtractedResource = {
  url: string;
  host: string;
  kind: ResourceKind;
  isThirdParty: boolean;
  inHead?: boolean;
  attrs?: Record<string, string | boolean>;
};

export type FindingCategory = "RESILIENCE" | "PERFORMANCE" | "SEO" | "SECURITY" | "UX" | "ACCESSIBILITY";
export type FindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FindingCode =
  | "THIRD_PARTY_FONTS"
  | "THIRD_PARTY_CRITICAL_JS"
  | "RECAPTCHA_DEPENDENCY"
  | "MIXED_CONTENT"
  | "NO_CSP_HEADER"
  | "NO_HSTS"
  | "STATIC_ASSETS_NO_LONG_CACHE"
  | "SLOW_TTFB_OR_SERVER_RESPONSE"
  | "TOO_MANY_REQUESTS_OR_HEAVY_PAGE"
  | "SEO_BASICS_MISSING"
  | "IMG_MISSING_ALT"
  | "IMG_EMPTY_ALT_MANY"
  | "INPUT_MISSING_LABEL"
  | "NO_ROBOTS_TXT"
  | "NO_SITEMAP"
  | "SLOW_SERVER_TTFB"
  | "SLOW_SERVER_RESPONSE"
  | "NO_SCHEMA_ORG"
  | "SCHEMA_ORG_PRESENT"
  | "SCHEMA_ORG_NO_RECOMMENDED_TYPES"
  | "SCHEMA_ORG_ERRORS"
  | "SCHEMA_ORG_WARNINGS"
  | "CWV_LCP_POOR_PROXY"
  | "CWV_FID_POOR_PROXY"
  | "CWV_CLS_POOR_PROXY"
  | "CWV_OVERALL_NEEDS_IMPROVEMENT"
  | "CWV_OVERALL_GOOD_PROXY"
  | "IMAGES_MISSING_LAZY_LOADING"
  | "IFRAMES_MISSING_LAZY_LOADING"
  | "SCRIPTS_MISSING_ASYNC_DEFER"
  | "LAZY_LOADING_IMPLEMENTED";

export type Finding = {
  code: FindingCode;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description?: string;
  recommendation: string;
  evidence?: Record<string, unknown>;
};

export type SeoBasics = {
  title: boolean;
  metaDescription: boolean;
  canonical: boolean;
  openGraph: boolean;
};

export type AuditContext = {
  target: {
    normalizedUrl: string;
    origin: string;
    host: string;
    protocol: "http:" | "https:";
    firstPartyHosts: Set<string>;
  };
  main: {
    finalUrl: string;
    status: number;
    headers: Record<string, string>;
    html: string;
    metrics?: {
      ttfbMs?: number;
      responseMs?: number;
    };
  };
  resources: ExtractedResource[];
  seo: SeoBasics;
};
