import { SAMPLE_DEMO_URL } from "./sample-report/demo-findings";
import type { SampleLocale } from "./sample-report/types";
import { localePath } from "./sample-report/copy";

export type AuditCtaIntent =
  | "audit_start"
  | "sample_report"
  | "pricing_view"
  | "signup"
  | "agency_contact"
  | "professional_review";

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
  prefillDemoUrl?: boolean;
  variant?: "primary" | "secondary";
};

const PROFESSIONAL_REVIEW_URL =
  "https://alirezasafaeisystems.ir/services?utm_source=audit&utm_medium=cta_registry&utm_campaign=asdev_audit&utm_content=professional_review";

const entries: AuditCtaEntry[] = [
  {
    id: "sample_report_audit_start",
    intent: "audit_start",
    surface: "sample_report",
    label: { fa: "شروع ارزیابی رایگان", en: "Start free assessment" },
    path: "/audit",
    analyticsEvent: "seo_cta_click",
    variant: "primary",
  },
  {
    id: "sample_report_own_report",
    intent: "audit_start",
    surface: "sample_report",
    label: { fa: "گزارش سایت خودم را می‌خواهم", en: "I want my site's report" },
    path: "/audit",
    analyticsEvent: "seo_cta_click",
    prefillDemoUrl: true,
    variant: "secondary",
  },
  {
    id: "sample_report_pricing",
    intent: "pricing_view",
    surface: "sample_report",
    label: { fa: "مشاهده پلن‌ها", en: "View plans" },
    path: "/pricing",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "sample_report_signup",
    intent: "signup",
    surface: "sample_report",
    label: { fa: "ثبت‌نام", en: "Sign up" },
    path: "/signup",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "sample_report_pro_review",
    intent: "professional_review",
    surface: "sample_report",
    label: { fa: "درخواست بررسی حرفه‌ای", en: "Request professional review" },
    path: PROFESSIONAL_REVIEW_URL,
    external: true,
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_home_sample_report",
    intent: "sample_report",
    surface: "audit_home",
    label: { fa: "مشاهده نمونه خروجی", en: "View sample output" },
    path: "/sample-report",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_landing_sample_report",
    intent: "sample_report",
    surface: "audit_landing",
    label: { fa: "نمونه گزارش", en: "Sample report" },
    path: "/sample-report",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_landing_sample_report_full",
    intent: "sample_report",
    surface: "audit_landing",
    label: { fa: "مشاهده نمونه گزارش کامل", en: "View full sample report" },
    path: "/sample-report",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_landing_start",
    intent: "audit_start",
    surface: "audit_landing",
    label: { fa: "شروع ارزیابی رایگان", en: "Start free assessment" },
    path: "/audit",
    analyticsEvent: "seo_cta_click",
    variant: "primary",
  },
  {
    id: "audit_landing_pricing",
    intent: "pricing_view",
    surface: "audit_landing",
    label: { fa: "مشاهده پلن‌ها", en: "View plans" },
    path: "/pricing",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_landing_pricing_plans",
    intent: "pricing_view",
    surface: "audit_landing",
    label: { fa: "مشاهده پلن‌ها و قیمت‌ها", en: "View plans and pricing" },
    path: "/pricing",
    analyticsEvent: "seo_cta_click",
    variant: "primary",
  },
  {
    id: "audit_landing_signup_free",
    intent: "signup",
    surface: "audit_landing",
    label: { fa: "ثبت‌نام رایگان", en: "Free signup" },
    path: "/signup",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_landing_feature_sample",
    intent: "sample_report",
    surface: "audit_landing",
    label: { fa: "مشاهده نمونه گزارش", en: "View sample report" },
    path: "/sample-report",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "audit_landing_feature_pillar",
    intent: "sample_report",
    surface: "audit_landing",
    label: { fa: "مطالعه چارچوب ارزیابی", en: "Read audit framework" },
    path: "/pillar/iran-readiness-audit",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "pricing_page_audit_start",
    intent: "audit_start",
    surface: "pricing_page",
    label: { fa: "شروع ارزیابی رایگان", en: "Start free assessment" },
    path: "/audit",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "pricing_page_sample_report",
    intent: "sample_report",
    surface: "pricing_page",
    label: { fa: "مشاهده نمونه گزارش", en: "View sample report" },
    path: "/sample-report",
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  {
    id: "intent_router_audit_start",
    intent: "audit_start",
    surface: "audit_landing",
    label: { fa: "شروع ارزیابی", en: "Start Audit" },
    path: "/audit",
    analyticsEvent: "seo_cta_click",
    variant: "primary",
  },
  {
    id: "intent_router_professional_review",
    intent: "professional_review",
    surface: "audit_landing",
    label: { fa: "ورود به سایت Alireza Safaei", en: "Open Alireza Safaei Systems" },
    path: "https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=asdev_audit&utm_content=execution_route",
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
    "en/page.tsx hero external portfolio/toolbox links",
    "faq/failed page retry links",
  ],
  unchangedByDesign: ["SeoPageEvent page views", "audit form submit events (seo_audit_start)"],
} as const;

export function validateAuditCtaRegistry(): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (!entry.id || !entry.intent || !entry.surface) {
      errors.push(`missing fields on ${entry.id || "unknown"}`);
    }
    if (!entry.label.fa || !entry.label.en) {
      errors.push(`missing bilingual label on ${entry.id}`);
    }
    if (!entry.path) {
      errors.push(`missing path on ${entry.id}`);
    }
    if (!entry.external && !entry.path.startsWith("/")) {
      errors.push(`internal path must start with / on ${entry.id}`);
    }
    if (entry.external && !entry.path.startsWith("http")) {
      errors.push(`external path must be absolute URL on ${entry.id}`);
    }
  }
  return errors;
}

export function getAuditCta(id: string): AuditCtaEntry | undefined {
  return entries.find((e) => e.id === id);
}

export function getAuditCtasForSurface(surface: AuditCtaSurface): AuditCtaEntry[] {
  return entries.filter((e) => e.surface === surface);
}

export function getAllAuditCtas(): AuditCtaEntry[] {
  return [...entries];
}

export function buildAuditCtaHref(
  entry: AuditCtaEntry,
  locale: SampleLocale,
  options?: { prefillUrl?: string }
): string {
  if (entry.external) {
    return entry.path;
  }

  const base = localePath(entry.path, locale);
  if (!entry.prefillDemoUrl && !options?.prefillUrl) {
    return base;
  }

  const url = options?.prefillUrl ?? SAMPLE_DEMO_URL;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}url=${encodeURIComponent(url)}`;
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