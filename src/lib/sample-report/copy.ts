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
  grade: string;
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
    "نمونه آموزشی گزارش ممیزی فنی سایت شامل امنیت، سئو، عملکرد و دسترسی‌پذیری با یافته‌های anonymized و پیشنهاد اصلاح.",
  heroTitle: "نمونه گزارش ممیزی سایت",
  heroLead:
    "این یک نمونه آموزشی anonymized است. یافته‌ها بر اساس بررسی‌های فنی نمایشی ساخته شده‌اند — نه مشتری واقعی.",
  demoBadge: "نمونه آموزشی — anonymous-example.ir",
  executiveSummary: "خلاصه مدیریتی",
  overallScore: "امتیاز نمونه",
  grade: "رده",
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
    "این صفحه نمونه آموزشی است. امتیاز و یافته‌ها از بررسی فنی anonymized گرفته شده‌اند. هیچ تضمین رتبه، درآمد یا نتیجه قطعی ارائه نمی‌شود.",
  trustDetails: [
    "دامنه نمونه: anonymous-example.ir (غیرواقعی)",
    "امتیاز ۵۸/D صرفاً نمایشی است",
    "یافته‌ها بر اساس بررسی فنی استاندارد هستند",
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
    "Educational sample technical audit report covering security, SEO, performance, and accessibility with anonymized demo findings.",
  heroTitle: "Sample Website Audit Report",
  heroLead:
    "This is an anonymized educational sample. Findings are based on illustrative technical checks — not a real customer.",
  demoBadge: "Educational sample — anonymous-example.ir",
  executiveSummary: "Executive Summary",
  overallScore: "Sample score",
  grade: "Grade",
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
    "This page is an educational sample. Scores and findings come from anonymized technical checks. No ranking, revenue, or outcome guarantees are implied.",
  trustDetails: [
    "Sample domain: anonymous-example.ir (fictional)",
    "Score 58/D is illustrative only",
    "Findings are based on standard technical checks",
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