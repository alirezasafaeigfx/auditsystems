import type { SampleLocale } from "./sample-report/types";
import { localePath } from "./sample-report/copy";

export type AuditCtaIntent =
  | "audit_start"
  | "sample_report"
  | "pricing_view"
  | "signup"
  | "professional_review"
  | "implementation_enquiry"
  | "audit_framework"
  | "agency_contact";

export type AuditCtaOwner = "audit" | "asdev" | "persian_toolbox";

export type AuditCtaDestinationClass =
  | "automated_audit"
  | "sample_report"
  | "pricing"
  | "account_signup"
  | "specialist_review"
  | "implementation_enquiry"
  | "audit_content"
  | "utility_site";

export type AuditIntentPolicy = {
  owner: AuditCtaOwner;
  destinationClass: AuditCtaDestinationClass;
  path: string;
  external: boolean;
  localeStrategy: "prefix" | "shared";
};

export const AUDIT_INTENT_POLICY: Record<AuditCtaIntent, AuditIntentPolicy> = {
  audit_start: { owner: "audit", destinationClass: "automated_audit", path: "/audit", external: false, localeStrategy: "prefix" },
  sample_report: { owner: "audit", destinationClass: "sample_report", path: "/sample-report", external: false, localeStrategy: "prefix" },
  pricing_view: { owner: "audit", destinationClass: "pricing", path: "/pricing", external: false, localeStrategy: "prefix" },
  signup: {
    owner: "audit",
    destinationClass: "account_signup",
    path: "/signup",
    external: false,
    // Current source has only src/app/signup/page.tsx; there is no /en/signup.
    localeStrategy: "shared",
  },
  professional_review: { owner: "audit", destinationClass: "specialist_review", path: "/qualification", external: false, localeStrategy: "prefix" },
  implementation_enquiry: { owner: "asdev", destinationClass: "implementation_enquiry", path: "https://alirezasafaeisystems.ir/qualification", external: true, localeStrategy: "prefix" },
  audit_framework: { owner: "audit", destinationClass: "audit_content", path: "/pillar/iran-readiness-audit", external: false, localeStrategy: "prefix" },
  agency_contact: { owner: "persian_toolbox", destinationClass: "utility_site", path: "https://persiantoolbox.ir/", external: true, localeStrategy: "shared" },
};

export type AuditCtaSurface =
  | "audit_home"
  | "sample_report"
  | "portfolio_home"
  | "portfolio_case_study"
  | "toolbox_tool_page"
  | "toolbox_home"
  | "pricing_page"
  | "audit_landing";

export type AuditCtaEntry = {
  id: string;
  intent: AuditCtaIntent;
  surface: AuditCtaSurface;
  label: Record<SampleLocale, string>;
  path: string;
  external?: boolean;
  analyticsEvent: string;
  variant?: "primary" | "secondary";
};

const entries: AuditCtaEntry[] = [
  { id: "sample_report_audit_start", intent: "audit_start", surface: "sample_report", label: { fa: "شروع ارزیابی خودکار", en: "Start automated audit" }, path: "/audit", analyticsEvent: "seo_cta_click", variant: "primary" },
  { id: "sample_report_own_report", intent: "audit_start", surface: "sample_report", label: { fa: "ارزیابی سایت خودم", en: "Audit my website" }, path: "/audit", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "sample_report_pricing", intent: "pricing_view", surface: "sample_report", label: { fa: "مشاهده قیمت‌ها", en: "View pricing" }, path: "/pricing", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "sample_report_signup", intent: "signup", surface: "sample_report", label: { fa: "ساخت حساب", en: "Create account" }, path: "/signup", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "sample_report_pro_review", intent: "professional_review", surface: "sample_report", label: { fa: "درخواست بررسی تخصصی", en: "Request specialist review" }, path: "/qualification", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_home_sample_report", intent: "sample_report", surface: "audit_home", label: { fa: "مشاهده نمونه خروجی", en: "View sample output" }, path: "/sample-report", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_landing_sample_report", intent: "sample_report", surface: "audit_landing", label: { fa: "نمونه گزارش", en: "Sample report" }, path: "/sample-report", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_landing_sample_report_full", intent: "sample_report", surface: "audit_landing", label: { fa: "مشاهده نمونه گزارش کامل", en: "View full sample report" }, path: "/sample-report", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_landing_start", intent: "audit_start", surface: "audit_landing", label: { fa: "شروع ارزیابی خودکار", en: "Start automated audit" }, path: "/audit", analyticsEvent: "seo_cta_click", variant: "primary" },
  { id: "audit_landing_pricing", intent: "pricing_view", surface: "audit_landing", label: { fa: "مشاهده قیمت‌ها", en: "View pricing" }, path: "/pricing", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_landing_pricing_plans", intent: "pricing_view", surface: "audit_landing", label: { fa: "مشاهده پلن‌ها", en: "View plans" }, path: "/pricing", analyticsEvent: "seo_cta_click", variant: "primary" },
  { id: "audit_landing_signup_free", intent: "signup", surface: "audit_landing", label: { fa: "ساخت حساب", en: "Create account" }, path: "/signup", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_landing_feature_sample", intent: "sample_report", surface: "audit_landing", label: { fa: "مشاهده نمونه گزارش", en: "View sample report" }, path: "/sample-report", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "audit_landing_feature_pillar", intent: "audit_framework", surface: "audit_landing", label: { fa: "مطالعه چارچوب ارزیابی", en: "Read audit framework" }, path: "/pillar/iran-readiness-audit", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "pricing_page_audit_start", intent: "audit_start", surface: "pricing_page", label: { fa: "شروع ارزیابی خودکار", en: "Start automated audit" }, path: "/audit", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "pricing_page_sample_report", intent: "sample_report", surface: "pricing_page", label: { fa: "مشاهده نمونه گزارش", en: "View sample report" }, path: "/sample-report", analyticsEvent: "seo_cta_click", variant: "secondary" },
  { id: "intent_router_audit_start", intent: "audit_start", surface: "audit_landing", label: { fa: "شروع ارزیابی خودکار", en: "Start automated audit" }, path: "/audit", analyticsEvent: "seo_cta_click", variant: "primary" },
  {
    id: "intent_router_professional_review",
    intent: "implementation_enquiry",
    surface: "audit_landing",
    label: { fa: "درخواست همکاری برای اجرا", en: "Request implementation support" },
    path: "https://alirezasafaeisystems.ir/qualification?utm_source=audit&utm_medium=intent_router&utm_campaign=asdev_audit&utm_content=implementation_enquiry",
    external: true,
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "intent_router_toolbox",
    intent: "agency_contact",
    surface: "audit_landing",
    label: { fa: "ورود به PersianToolbox", en: "Open PersianToolbox" },
    path: "https://persiantoolbox.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=asdev_audit&utm_content=toolbox_route",
    external: true,
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
];

const SAFE_FIXED_QUERY_VALUES: Record<string, ReadonlySet<string>> = {
  utm_source: new Set(["audit"]),
  utm_medium: new Set(["intent_router"]),
  utm_campaign: new Set(["asdev_audit"]),
  utm_content: new Set(["implementation_enquiry", "toolbox_route"]),
};

const ALLOWED_EXTERNAL_ORIGINS = new Set([
  "https://alirezasafaeisystems.ir",
  "https://persiantoolbox.ir",
]);

function safeQuery(searchParams: URLSearchParams): string {
  const safe = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (SAFE_FIXED_QUERY_VALUES[key]?.has(value)) {
      safe.append(key, value);
    }
  }
  const rendered = safe.toString();
  return rendered ? `?${rendered}` : "";
}

function localizedPath(entry: AuditCtaEntry, locale: SampleLocale, pathname: string): string {
  const policy = AUDIT_INTENT_POLICY[entry.intent];
  if (locale !== "en" || policy.localeStrategy === "shared") {
    return pathname;
  }
  return localePath(pathname, locale);
}

/** Registry-backed surfaces. Nav/layout links remain ad-hoc until a later pass. */
export const CTA_MIGRATION_STATUS = {
  registryBacked: [
    "sample_report",
    "audit_home",
    "audit_landing (hero + preview + features + subscription)",
    "pricing_page (footer CTAs)",
    "intent_router (via adapter)",
  ],
  adHocRemaining: [
    "layout.tsx navigation links",
    "pricing plan signup buttons (billing scope)",
    "faq/failed page retry links",
  ],
  unchangedByDesign: ["SeoPageEvent page views", "audit form submit events (seo_audit_start)"],
} as const;

export function validateAuditCtaRegistry(): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (!entry.id || !entry.intent || !entry.surface) {
      errors.push(`missing fields on ${entry.id || "unknown"}`);
      continue;
    }
    if (!entry.label.fa || !entry.label.en) {
      errors.push(`missing bilingual label on ${entry.id}`);
    }
    if (!entry.path) {
      errors.push(`missing path on ${entry.id}`);
      continue;
    }

    const policy = AUDIT_INTENT_POLICY[entry.intent];
    if (!policy) {
      errors.push(`missing intent policy on ${entry.id}`);
      continue;
    }
    if (Boolean(entry.external) !== policy.external) {
      errors.push(`destination class mismatch on ${entry.id}`);
    }

    try {
      if (entry.external) {
        const url = new URL(entry.path);
        const policyUrl = new URL(policy.path);
        if (url.protocol !== "https:" || !ALLOWED_EXTERNAL_ORIGINS.has(url.origin)) {
          errors.push(`external origin is not allowed on ${entry.id}`);
        }
        if (url.origin !== policyUrl.origin || url.pathname !== policyUrl.pathname) {
          errors.push(`external destination does not match intent policy on ${entry.id}`);
        }
      } else {
        const url = new URL(entry.path, "https://audit.invalid");
        if (url.origin !== "https://audit.invalid" || url.pathname !== policy.path) {
          errors.push(`internal destination does not match intent policy on ${entry.id}`);
        }
      }
    } catch {
      errors.push(`invalid destination on ${entry.id}`);
    }
  }
  return errors;
}

export function getAuditCta(id: string): AuditCtaEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export function getAuditCtasForSurface(surface: AuditCtaSurface): AuditCtaEntry[] {
  return entries.filter((entry) => entry.surface === surface);
}

export function getAllAuditCtas(): AuditCtaEntry[] {
  return [...entries];
}

export function buildAuditCtaHref(
  entry: AuditCtaEntry,
  locale: SampleLocale,
  options?: { prefillUrl?: string }
): string {
  // Compatibility callers may still pass prefillUrl, but AU-04 deliberately
  // discards it so customer/audited URLs cannot enter hrefs or analytics.
  void options;

  const policy = AUDIT_INTENT_POLICY[entry.intent];
  if (!policy || Boolean(entry.external) !== policy.external) {
    return "#";
  }

  try {
    if (entry.external) {
      const url = new URL(entry.path);
      const policyUrl = new URL(policy.path);
      if (url.protocol !== "https:" || !ALLOWED_EXTERNAL_ORIGINS.has(url.origin)) {
        return "#";
      }
      if (url.origin !== policyUrl.origin || url.pathname !== policyUrl.pathname) {
        return "#";
      }
      return `${url.origin}${localizedPath(entry, locale, url.pathname)}${safeQuery(url.searchParams)}`;
    }

    const url = new URL(entry.path, "https://audit.invalid");
    if (url.origin !== "https://audit.invalid" || url.pathname !== policy.path) {
      return "#";
    }
    return `${localizedPath(entry, locale, url.pathname)}${safeQuery(url.searchParams)}`;
  } catch {
    return "#";
  }
}

export function getSampleReportCtaIds(): string[] {
  return [
    "sample_report_audit_start",
    "sample_report_own_report",
    "sample_report_pricing",
    "sample_report_signup",
    "sample_report_pro_review",
  ];
}
