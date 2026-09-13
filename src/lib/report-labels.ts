import type { AuditStatus } from "@prisma/client";
import { gradeLabel, type ScoreBreakdown } from "./scoring";

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
