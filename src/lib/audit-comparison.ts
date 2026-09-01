import { calculateScore, categoryLabel } from "./scoring";
import { resolvePersistedScore } from "./persisted-score";
import type { FindingCategory, FindingSeverity } from "./types";

export type AuditRun = {
  url?: string;
  normalizedUrl?: string;
  findings: { code: string; category: FindingCategory; severity: FindingSeverity; title: string }[];
  summary?: {
    score?: number;
    grade?: string;
    categoryScores?: Record<FindingCategory, number>;
    severityCounts?: Record<FindingSeverity, number>;
    scoringPolicyVersion?: "worst-severity-v2";
  };
};

export type ScoreDelta = {
  before: number;
  after: number;
  delta: number | null;
  direction: "improved" | "regressed" | "stable" | "unavailable";
};

export type IssueDelta = {
  code: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
};

export type CategoryDelta = {
  category: FindingCategory;
  label: string;
  before: number;
  after: number;
  delta: number | null;
  direction: "improved" | "regressed" | "stable" | "unavailable";
};

export type AuditComparison = {
  overall: ScoreDelta;
  gradeBefore: string;
  gradeAfter: string;
  newIssues: IssueDelta[];
  resolvedIssues: IssueDelta[];
  unchangedIssues: IssueDelta[];
  categories: CategoryDelta[];
};

function direction(delta: number): "improved" | "regressed" | "stable" {
  if (delta > 0) return "improved";
  if (delta < 0) return "regressed";
  return "stable";
}

function gradeFromScore(score: number): string {
  if (score >= 81) return "EXCELLENT";
  if (score >= 61) return "GOOD";
  if (score >= 41) return "NEEDS_WORK";
  return "CRITICAL";
}

export function compareAuditRuns(runA: AuditRun, runB: AuditRun): AuditComparison {
  const resolvedA = resolvePersistedScore(runA.summary, calculateScore(runA.findings));
  const resolvedB = resolvePersistedScore(runB.summary, calculateScore(runB.findings));
  const scoreA = resolvedA.score;
  const scoreB = resolvedB.score;

  const scoreABefore = scoreA.overall;
  const scoreBAfter = scoreB.overall;

  const scoreDelta = scoreBAfter - scoreABefore;
  const comparable = resolvedA.compatible && resolvedB.compatible && resolvedA.policyVersion === resolvedB.policyVersion;

  const codesA = new Set(runA.findings.map((f) => f.code));
  const codesB = new Set(runB.findings.map((f) => f.code));

  const newIssues: IssueDelta[] = runB.findings
    .filter((f) => !codesA.has(f.code))
    .map((f) => ({ code: f.code, title: f.title, category: f.category, severity: f.severity }));

  const resolvedIssues: IssueDelta[] = runA.findings
    .filter((f) => !codesB.has(f.code))
    .map((f) => ({ code: f.code, title: f.title, category: f.category, severity: f.severity }));

  const unchangedIssues: IssueDelta[] = runA.findings
    .filter((f) => codesB.has(f.code))
    .map((f) => ({ code: f.code, title: f.title, category: f.category, severity: f.severity }));

  const categoryMapA = scoreA.categories;
  const categoryMapB = scoreB.categories;

  const allCategories = new Set<FindingCategory>([
    ...Object.keys(categoryMapA) as FindingCategory[],
    ...Object.keys(categoryMapB) as FindingCategory[],
  ]);

  const categories: CategoryDelta[] = [];
  for (const cat of allCategories) {
    const before = categoryMapA[cat] ?? 100;
    const after = categoryMapB[cat] ?? 100;
    const delta = comparable ? after - before : null;
    categories.push({
      category: cat,
      label: categoryLabel(cat),
      before,
      after,
      delta,
      direction: delta === null ? "unavailable" : direction(delta),
    });
  }

  return {
    overall: {
      before: scoreABefore,
      after: scoreBAfter,
      delta: comparable ? scoreDelta : null,
      direction: comparable ? direction(scoreDelta) : "unavailable",
    },
    gradeBefore: scoreA.grade ?? gradeFromScore(scoreABefore),
    gradeAfter: scoreB.grade ?? gradeFromScore(scoreBAfter),
    newIssues,
    resolvedIssues,
    unchangedIssues,
    categories,
  };
}
