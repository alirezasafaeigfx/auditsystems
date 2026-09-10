import { categoryLabel } from "./scoring";
import { resolveReportResult, type ResultAvailability } from "./report-result";
import type { FindingCategory, FindingSeverity } from "./types";

export type AuditRun = {
  url?: string;
  normalizedUrl?: string;
  findings: { code: string; category: FindingCategory; severity: FindingSeverity; title: string }[];
  status?: string;
  summary?: Record<string, unknown>;
};

export type ScoreDelta = {
  before: number | null;
  after: number | null;
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
  before: number | null;
  after: number | null;
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
  availabilityBefore: ResultAvailability;
  availabilityAfter: ResultAvailability;
  coverageBefore: number | null;
  coverageAfter: number | null;
};

function direction(delta: number): "improved" | "regressed" | "stable" {
  if (delta > 0) return "improved";
  if (delta < 0) return "regressed";
  return "stable";
}

export function compareAuditRuns(runA: AuditRun, runB: AuditRun): AuditComparison {
  const resolvedA = resolveReportResult({ summary: runA.summary, findings: runA.findings, runStatus: runA.status ?? "SUCCEEDED" });
  const resolvedB = resolveReportResult({ summary: runB.summary, findings: runB.findings, runStatus: runB.status ?? "SUCCEEDED" });
  const scoreABefore = resolvedA.score?.overall ?? null;
  const scoreBAfter = resolvedB.score?.overall ?? null;
  const comparable = resolvedA.comparable
    && resolvedB.comparable
    && resolvedA.policyVersion === resolvedB.policyVersion
    && resolvedA.availability === resolvedB.availability
    && resolvedA.coverage.ratio === resolvedB.coverage.ratio
    && resolvedA.coverage.coveredCategories.join("|") === resolvedB.coverage.coveredCategories.join("|");
  const scoreDelta = comparable && scoreABefore !== null && scoreBAfter !== null ? scoreBAfter - scoreABefore : null;

  const codesA = new Set(runA.findings.map((f) => f.code));
  const codesB = new Set(runB.findings.map((f) => f.code));

  const newIssues: IssueDelta[] = comparable ? runB.findings
    .filter((f) => !codesA.has(f.code))
    .map((f) => ({ code: f.code, title: f.title, category: f.category, severity: f.severity })) : [];

  const resolvedIssues: IssueDelta[] = comparable ? runA.findings
    .filter((f) => !codesB.has(f.code))
    .map((f) => ({ code: f.code, title: f.title, category: f.category, severity: f.severity })) : [];

  const unchangedIssues: IssueDelta[] = comparable ? runA.findings
    .filter((f) => codesB.has(f.code))
    .map((f) => ({ code: f.code, title: f.title, category: f.category, severity: f.severity })) : [];

  const categoryMapA = resolvedA.categoryScores;
  const categoryMapB = resolvedB.categoryScores;

  const allCategories = new Set<FindingCategory>([
    ...Object.keys(categoryMapA) as FindingCategory[],
    ...Object.keys(categoryMapB) as FindingCategory[],
  ]);

  const categories: CategoryDelta[] = [];
  for (const cat of allCategories) {
    const before = categoryMapA[cat] ?? null;
    const after = categoryMapB[cat] ?? null;
    const delta = comparable && before !== null && after !== null ? after - before : null;
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
      delta: scoreDelta,
      direction: scoreDelta === null ? "unavailable" : direction(scoreDelta),
    },
    gradeBefore: resolvedA.score?.grade ?? "UNAVAILABLE",
    gradeAfter: resolvedB.score?.grade ?? "UNAVAILABLE",
    newIssues,
    resolvedIssues,
    unchangedIssues,
    categories,
    availabilityBefore: resolvedA.availability,
    availabilityAfter: resolvedB.availability,
    coverageBefore: resolvedA.coverage.ratio,
    coverageAfter: resolvedB.coverage.ratio,
  };
}
