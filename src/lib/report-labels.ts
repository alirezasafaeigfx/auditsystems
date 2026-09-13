import type { AuditStatus } from "@prisma/client";
import { gradeLabel, type ScoreBreakdown } from "./scoring";
import type { ReportResult } from "./report-result";

type ReportLocale = "fa" | "en";

const statusLabels: Record<ReportLocale, Record<AuditStatus, string>> = {
  fa: { QUEUED: "در صف", RUNNING: "در حال اجرا", SUCCEEDED: "تکمیل‌شده", FAILED: "ناموفق" },
  en: { QUEUED: "Queued", RUNNING: "Running", SUCCEEDED: "Completed", FAILED: "Failed" },
};

const englishGradeLabels: Record<ScoreBreakdown["grade"], string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  NEEDS_WORK: "Needs work",
  CRITICAL: "Critical",
};

export function reportStatusLabel(status: AuditStatus, locale: ReportLocale): string {
  return statusLabels[locale][status];
}

export function reportGradeLabel(grade: ScoreBreakdown["grade"], locale: ReportLocale): string {
  return locale === "fa" ? gradeLabel(grade) : englishGradeLabels[grade];
}

export function reportWithheldReasonFa(result: ReportResult): string | null {
  if (!result.withheldReason) return null;
  if (result.processingStatus === "FAILED") return "ممیزی با موفقیت کامل نشد.";
  if (result.processingStatus !== "SUCCEEDED") return "ممیزی هنوز کامل نشده است.";
  if (result.withheldReason === "Measurement evidence is stale and blocked.") return "شواهد اندازه‌گیری قدیمی است و امتیاز نمایش داده نمی‌شود.";
  if (result.withheldReason === "No measurement category completed.") return "هیچ دسته‌ای به‌طور کامل اندازه‌گیری نشد.";
  if (result.availability === "INVALID") return "داده‌های ثبت‌شده برای نمایش امتیاز معتبر نیستند.";
  return "شواهد کافی برای نمایش امتیاز در دسترس نیست.";
}

export function reportWithheldReasonEn(result: ReportResult): string | null {
  if (!result.withheldReason) return null;
  if (result.processingStatus === "QUEUED" || result.processingStatus === "RUNNING") return "The audit is still in progress.";
  return result.withheldReason;
}
