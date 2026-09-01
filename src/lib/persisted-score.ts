import type { ScoreBreakdown } from "./scoring";
import type { FindingCategory, FindingSeverity } from "./types";

const CATEGORIES: FindingCategory[] = ["SEO", "PERFORMANCE", "SECURITY", "UX", "ACCESSIBILITY", "RESILIENCE"];
const SEVERITIES: FindingSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const GRADES: ScoreBreakdown["grade"][] = ["EXCELLENT", "GOOD", "NEEDS_WORK", "CRITICAL"];
export const LEGACY_SCORING_POLICY_VERSION = "legacy-v1";
export const CURRENT_SCORING_POLICY_VERSION = "worst-severity-v2";

export function scoringPolicyVersionFromSummary(summary: unknown): string {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return LEGACY_SCORING_POLICY_VERSION;
  return (summary as Record<string, unknown>).scoringPolicyVersion === CURRENT_SCORING_POLICY_VERSION
    ? CURRENT_SCORING_POLICY_VERSION
    : LEGACY_SCORING_POLICY_VERSION;
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= 100;
}

function hasExactScores(value: unknown, keys: readonly string[]): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === keys.length && keys.every((key) => isScore(record[key]));
}

function hasExactCounts(value: unknown): value is Record<FindingSeverity, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === SEVERITIES.length
    && SEVERITIES.every((key) => typeof record[key] === "number" && Number.isSafeInteger(record[key]) && record[key] >= 0);
}

function gradeFromScore(score: number): ScoreBreakdown["grade"] {
  if (score >= 81) return "EXCELLENT";
  if (score >= 61) return "GOOD";
  if (score >= 41) return "NEEDS_WORK";
  return "CRITICAL";
}

/**
 * Historical summaries have no policy-version field. A complete, internally valid
 * persisted score is therefore authoritative; incomplete or malformed summaries
 * fall back to the current calculation without rewriting stored audit data.
 */
export type ResolvedScore = { score: ScoreBreakdown; policyVersion: string; compatible: boolean };

export function resolvePersistedScore(summary: unknown, calculated: ScoreBreakdown): ResolvedScore {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return { score: calculated, policyVersion: CURRENT_SCORING_POLICY_VERSION, compatible: true };
  const persisted = summary as Record<string, unknown>;
  const explicitVersion = persisted.scoringPolicyVersion;
  if (explicitVersion !== undefined && explicitVersion !== CURRENT_SCORING_POLICY_VERSION) {
    return { score: calculated, policyVersion: String(explicitVersion), compatible: false };
  }
  if (!isScore(persisted.score)
    || !GRADES.includes(persisted.grade as ScoreBreakdown["grade"])
    || persisted.grade !== gradeFromScore(persisted.score)
    || !hasExactScores(persisted.categoryScores, CATEGORIES)
    || !hasExactCounts(persisted.severityCounts)) return { score: calculated, policyVersion: CURRENT_SCORING_POLICY_VERSION, compatible: true };

  return { score: {
      ...calculated, overall: persisted.score, grade: persisted.grade as ScoreBreakdown["grade"],
      categories: persisted.categoryScores as Record<FindingCategory, number>, severityCounts: persisted.severityCounts,
    }, policyVersion: explicitVersion === CURRENT_SCORING_POLICY_VERSION ? CURRENT_SCORING_POLICY_VERSION : LEGACY_SCORING_POLICY_VERSION, compatible: true };
}

export function scoreFromPersistedSummary(summary: unknown, calculated: ScoreBreakdown): ScoreBreakdown {
  return resolvePersistedScore(summary, calculated).score;
}
