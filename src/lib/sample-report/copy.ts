import type { SampleCategory, SampleDifficulty, SampleLocale, SampleOwner, SampleSeverity } from "./types";

export type SampleReportCopy = {
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroLead: string;
  demoBadge: string;
  executiveSummary: string;
  overallScore: string;
  evidenceStatus: string;
  confirmed: string;
  hypothesis: string;
  priority: string;
  actionPlan: string;
  totalFindings: string;
  severityLabels: Record<SampleSeverity, string>;
  topUrgent: string;
  nextSteps: string;
  securityHeaders: string;
  seoStatus: string;
  present: string;
  missing: string;
  findingsBySeverity: string;
  findingsByCategory: string;
  findingCount: (n: number) => string;
  evidence: string;
  impact: string;
  recommendation: string;
  owner: string;
  difficulty: string;
  categoryLabels: Record<SampleCategory, string>;
  ownerLabels: Record<SampleOwner, string>;
  difficultyLabels: Record<SampleDifficulty, string>;
  trustTitle: string;
  trustBody: string;
  trustDetails: string[];
  ctaTitle: string;
  ctaLead: string;
  severitySrPrefix: string;
};

const copyFa: SampleReportCopy = {
  pageTitle: "نمونه گزارش ممیزی سایت",
  metaTitle: "نمونه گزارش ممیزی سایت",
  metaDescription:
    "نمونه آموزشی گزارش ممیزی فنی سایت شامل امنیت، سئو، عملکرد و دسترسی‌پذیری با داده‌های کاملاً نمایشی و پیشنهاد اصلاح.",
  heroTitle: "نمونه گزارش ممیزی سایت",
  heroLead:
    "این یک سناریوی آموزشی کاملاً نمایشی است. دامنه، یافته‌ها و اعداد متعلق به مشتری یا اندازه‌گیری واقعی نیستند.",
  demoBadge: "نمونه آموزشی — anonymous-example.ir",
  executiveSummary: "خلاصه مدیریتی",
  overallScore: "وضعیت evidence",
  evidenceStatus: "یافته قطعی / فرضیه",
  confirmed: "قطعی",
  hypothesis: "فرضیه نیازمند بررسی",
  priority: "اولویت",
  actionPlan: "برنامه اقدام ۳۰ روزه",
  totalFindings: "تعداد یافته‌ها",
  severityLabels: {
    CRITICAL: "بحرانی",
    HIGH: "بالا",
    MEDIUM: "متوسط",
    LOW: "پایین",
  },
  topUrgent: "۳ اولویت فوری",
  nextSteps: "گام بعدی پیشنهادی",
  securityHeaders: "هدرهای امنیتی",
  seoStatus: "وضعیت سئو",
  present: "موجود",
  missing: "موجود نیست",
  findingsBySeverity: "یافته‌ها بر اساس شدت",
  findingsByCategory: "یافته‌ها بر اساس دسته",
  findingCount: (n) => `(${n})`,
  evidence: "مدرک",
  impact: "تأثیر کسب‌وکار",
  recommendation: "پیشنهاد اصلاح",
  owner: "مسئول پیشنهادی",
  difficulty: "سختی",
  categoryLabels: {
    seo: "سئو",
    performance: "عملکرد",
    security: "امنیت",
    ux_mobile: "UX / موبایل",
    accessibility: "دسترسی‌پذیری",
    content: "محتوا",
  },
  ownerLabels: {
    seo: "متخصص سئو",
    developer: "توسعه‌دهنده",
    content_manager: "مدیر محتوا",
    hosting_admin: "هاستینگ / زیرساخت",
  },
  difficultyLabels: {
    easy: "آسان",
    medium: "متوسط",
    hard: "سخت",
  },
  trustTitle: "درباره این گزارش",
  trustBody:
    "این صفحه یک سناریوی آموزشی ساختگی برای نمایش قالب گزارش است. هیچ‌یک از امتیازها، یافته‌ها یا مقادیر آن داده واقعی مشتری نیست و هیچ تضمین رتبه، درآمد یا نتیجه‌ای ارائه نمی‌شود.",
  trustDetails: [
    "دامنه نمونه: anonymous-example.ir (غیرواقعی)",
    "تمام امتیازها و مقادیر سرعت صرفاً داده نمایشی برای توضیح ساختار گزارش‌اند",
    "برچسب قطعی یا فرضیه فقط وضعیت شواهد را در همین سناریوی نمایشی نشان می‌دهد",
    "هیچ اطلاعات مشتری واقعی نمایش داده نمی‌شود",
  ],
  ctaTitle: "گزارش سایت خود را بگیرید",
  ctaLead: "ارزیابی اولیه رایگان است. آدرس سایت را وارد کنید و مسیر اصلاح را ببینید.",
  severitySrPrefix: "شدت: ",
};

const copyEn: SampleReportCopy = {
  pageTitle: "Sample Website Audit Report",
  metaTitle: "Sample Website Audit Report",
  metaDescription:
    "Educational sample technical audit report covering security, SEO, performance, and accessibility with fully illustrative data.",
  heroTitle: "Sample Website Audit Report",
  heroLead:
    "This is a fully illustrative educational scenario. The domain, findings, and numbers do not come from a real customer or measurement.",
  demoBadge: "Educational sample — anonymous-example.ir",
  executiveSummary: "Executive Summary",
  overallScore: "Evidence status",
  evidenceStatus: "Confirmed / hypothesis",
  confirmed: "Confirmed",
  hypothesis: "Hypothesis to verify",
  priority: "Priority",
  actionPlan: "30-day action plan",
  totalFindings: "Total findings",
  severityLabels: {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  },
  topUrgent: "Top 3 urgent issues",
  nextSteps: "Recommended next step",
  securityHeaders: "Security headers",
  seoStatus: "SEO status",
  present: "Present",
  missing: "Missing",
  findingsBySeverity: "Findings by severity",
  findingsByCategory: "Findings by category",
  findingCount: (n) => `(${n})`,
  evidence: "Evidence",
  impact: "Business impact",
  recommendation: "Recommended fix",
  owner: "Suggested owner",
  difficulty: "Difficulty",
  categoryLabels: {
    seo: "SEO",
    performance: "Performance",
    security: "Security",
    ux_mobile: "UX / Mobile",
    accessibility: "Accessibility",
    content: "Content",
  },
  ownerLabels: {
    seo: "SEO specialist",
    developer: "Developer",
    content_manager: "Content manager",
    hosting_admin: "Hosting / infra",
  },
  difficultyLabels: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  },
  trustTitle: "About this report",
  trustBody:
    "This page is a fictional educational scenario that demonstrates the report format. None of its scores, findings, or values are real customer data, and no ranking, revenue, or outcome guarantee is implied.",
  trustDetails: [
    "Sample domain: anonymous-example.ir (fictional)",
    "All scores and speed values are illustrative data used to explain the report structure",
    "Confirmed and hypothesis labels describe evidence status only within this illustrative scenario",
    "No real customer data is displayed",
  ],
  ctaTitle: "Get a report for your site",
  ctaLead: "The initial assessment is free. Enter your URL and see a prioritized fix path.",
  severitySrPrefix: "Severity: ",
};

export function getSampleReportCopy(locale: SampleLocale): SampleReportCopy {
  return locale === "fa" ? copyFa : copyEn;
}

export function localePath(path: string, locale: SampleLocale): string {
  if (locale === "fa") {
    return path;
  }
  if (path === "/") {
    return "/en";
  }
  return `/en${path}`;
}
