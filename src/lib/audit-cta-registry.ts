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
];

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