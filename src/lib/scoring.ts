import { FindingCategory, FindingSeverity } from "./types";

export type ScoreBreakdown = {
  overall: number;
  categories: Record<FindingCategory, number>;
  grade: "EXCELLENT" | "GOOD" | "NEEDS_WORK" | "CRITICAL";
  severityCounts: Record<FindingSeverity, number>;
  totalFindings: number;
};

const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
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

  const totalDeduction = categoryFindings.reduce((sum, f) => sum + (SEVERITY_WEIGHTS[f.severity] ?? 0), 0);
  const maxDeduction = categoryFindings.length * 25;
  const score = Math.max(0, Math.round(100 - (totalDeduction / Math.max(maxDeduction, 1)) * 100));
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

  const totalDeduction = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHTS[f.severity] ?? 0), 0);
  const maxPossibleDeduction = Math.max(findings.length * 25, 1);
  const overall = Math.max(0, Math.round(100 - (totalDeduction / maxPossibleDeduction) * 100));

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
