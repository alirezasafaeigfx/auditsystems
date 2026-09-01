import { FindingCategory, FindingSeverity } from "./types";

export type ScoreBreakdown = {
  overall: number;
  categories: Record<FindingCategory, number>;
  grade: "EXCELLENT" | "GOOD" | "NEEDS_WORK" | "CRITICAL";
  severityCounts: Record<FindingSeverity, number>;
  totalFindings: number;
};

const SEVERITY_SCORES: Record<FindingSeverity, number> = {
  CRITICAL: 0,
  HIGH: 40,
  MEDIUM: 68,
  LOW: 88,
  INFO: 100,
};

const CATEGORY_ORDER: FindingCategory[] = [
  "SEO",
  "PERFORMANCE",
  "SECURITY",
  "UX",
  "ACCESSIBILITY",
  "RESILIENCE",
];

function calculateCategoryScore(findings: { category: FindingCategory; severity: FindingSeverity }[]): number {
  const categoryFindings = findings;
  if (categoryFindings.length === 0) return 100;

  const score = Math.min(...categoryFindings.map((f) => SEVERITY_SCORES[f.severity] ?? 100));
  return score;
}

function gradeFromScore(score: number): ScoreBreakdown["grade"] {
  if (score >= 81) return "EXCELLENT";
  if (score >= 61) return "GOOD";
  if (score >= 41) return "NEEDS_WORK";
  return "CRITICAL";
}

export function calculateScore(findings: { category: FindingCategory; severity: FindingSeverity }[]): ScoreBreakdown {
  const severityCounts: Record<FindingSeverity, number> = {
    INFO: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const f of findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;
  }

  const categories = {} as Record<FindingCategory, number>;
  for (const cat of CATEGORY_ORDER) {
    const catFindings = findings.filter((f) => f.category === cat);
    categories[cat] = calculateCategoryScore(catFindings);
  }

  const overall = findings.length === 0
    ? 100
    : Math.min(...findings.map((f) => SEVERITY_SCORES[f.severity] ?? 100));

  return {
    overall,
    categories,
    grade: gradeFromScore(overall),
    severityCounts,
    totalFindings: findings.length,
  };
}

export function formatScore(score: number): string {
  return `${score}/100`;
}

export function gradeLabel(grade: ScoreBreakdown["grade"]): string {
  const labels: Record<ScoreBreakdown["grade"], string> = {
    EXCELLENT: "عالی",
    GOOD: "خوب",
    NEEDS_WORK: "نیاز به بهبود",
    CRITICAL: "بحرانی",
  };
  return labels[grade];
}

export function categoryLabel(cat: FindingCategory): string {
  const labels: Record<FindingCategory, string> = {
    SEO: "سئو",
    PERFORMANCE: "سرعت",
    SECURITY: "امنیت",
    UX: "تجربه کاربری",
    ACCESSIBILITY: "دسترسی‌پذیری",
    RESILIENCE: "پایداری",
  };
  return labels[cat];
}
