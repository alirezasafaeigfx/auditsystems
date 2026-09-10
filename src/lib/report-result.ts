import { calculateScore, type ScoreBreakdown } from "./scoring";
import { resolvePersistedScore } from "./persisted-score";
import type { FindingCategory, FindingSeverity } from "./types";

export const RESULT_COVERAGE_SCHEMA = "asdev.audit.result-coverage.v1";
export const RESULT_CATEGORIES: FindingCategory[] = ["SEO", "PERFORMANCE", "SECURITY", "UX", "ACCESSIBILITY", "RESILIENCE"];
const CURRENT_ALWAYS_COVERED_CATEGORIES: FindingCategory[] = ["SECURITY", "ACCESSIBILITY", "RESILIENCE"];

export type ResultAvailability = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "LEGACY" | "INVALID";

export type ResultCoverage = {
  ratio: number | null;
  confidence: number | null;
  freshness: "FRESH" | "STALE_BLOCKED" | "UNKNOWN";
  coveredCategories: FindingCategory[];
  unavailableCategories: FindingCategory[];
  limitations: string[];
};

export type ReportResult = {
  processingStatus: string;
  availability: ResultAvailability;
  score: ScoreBreakdown | null;
  categoryScores: Record<FindingCategory, number | null>;
  coverage: ResultCoverage;
  withheldReason: string | null;
  policyVersion: string;
  comparable: boolean;
};

type FindingInput = { category: FindingCategory; severity: FindingSeverity; code?: string };

function unavailableCategories(): Record<FindingCategory, number | null> {
  return Object.fromEntries(RESULT_CATEGORIES.map((category) => [category, null])) as Record<FindingCategory, number | null>;
}

function unavailable(processingStatus: string, availability: "UNAVAILABLE" | "INVALID", reason: string): ReportResult {
  return {
    processingStatus,
    availability,
    score: null,
    categoryScores: unavailableCategories(),
    coverage: { ratio: null, confidence: null, freshness: "UNKNOWN", coveredCategories: [], unavailableCategories: [...RESULT_CATEGORIES], limitations: [reason] },
    withheldReason: reason,
    policyVersion: "unknown",
    comparable: false,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function categoryList(value: unknown): FindingCategory[] | null {
  if (!Array.isArray(value) || !value.every((item) => RESULT_CATEGORIES.includes(item as FindingCategory))) return null;
  const categories = value as FindingCategory[];
  return new Set(categories).size === categories.length ? categories : null;
}

function finiteRatio(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function exactNumericRecord(value: unknown, expected: Record<string, number>): boolean {
  const candidate = record(value);
  return candidate !== null
    && Object.keys(candidate).length === Object.keys(expected).length
    && Object.entries(expected).every(([key, expectedValue]) => candidate[key] === expectedValue);
}

export function resolveReportResult(input: { summary: unknown; findings: FindingInput[]; runStatus: string }): ReportResult {
  if (input.runStatus !== "SUCCEEDED") return unavailable(input.runStatus, "UNAVAILABLE", "The audit did not complete successfully.");

  const summary = record(input.summary);
  if (!summary) return unavailable(input.runStatus, "INVALID", "The stored result summary is missing or malformed.");

  const calculated = calculateScore(input.findings);
  const schema = summary.schema;
  if (schema === undefined) {
    const legacy = resolvePersistedScore(summary, calculated);
    if (!legacy.compatible || legacy.policyVersion !== "legacy-v1") return unavailable(input.runStatus, "INVALID", "The legacy scoring record is unsupported or contradictory.");
    if (!exactNumericRecord(summary.severityCounts, calculated.severityCounts)) return unavailable(input.runStatus, "INVALID", "The legacy severity aggregate contradicts the recorded findings.");
    return {
      processingStatus: input.runStatus,
      availability: "LEGACY",
      score: legacy.score,
      categoryScores: { ...legacy.score.categories },
      coverage: { ratio: null, confidence: null, freshness: "UNKNOWN", coveredCategories: [], unavailableCategories: [...RESULT_CATEGORIES], limitations: ["Legacy report: measurement coverage was not recorded."] },
      withheldReason: null,
      policyVersion: legacy.policyVersion,
      comparable: false,
    };
  }
  if (schema !== "asdev.audit.summary.v1") return unavailable(input.runStatus, "INVALID", "The result schema is unsupported.");

  if (summary.score !== calculated.overall
    || summary.grade !== calculated.grade
    || !exactNumericRecord(summary.categoryScores, calculated.categories)
    || !exactNumericRecord(summary.severityCounts, calculated.severityCounts)) {
    return unavailable(input.runStatus, "INVALID", "Stored score aggregates are missing, malformed, or contradict the recorded findings.");
  }
  const persisted = resolvePersistedScore(summary, calculated);
  if (!persisted.compatible || persisted.policyVersion !== "worst-severity-v2") {
    return unavailable(input.runStatus, "INVALID", "The scoring policy is unsupported.");
  }
  if (summary.resultCoverage === undefined) {
    return {
      processingStatus: input.runStatus,
      availability: "LEGACY",
      score: calculated,
      categoryScores: { ...calculated.categories },
      coverage: { ratio: null, confidence: null, freshness: "UNKNOWN", coveredCategories: [], unavailableCategories: [...RESULT_CATEGORIES], limitations: ["Historical report: measurement coverage was not recorded."] },
      withheldReason: null,
      policyVersion: persisted.policyVersion,
      comparable: false,
    };
  }
  const rawCoverage = record(summary.resultCoverage);
  if (!rawCoverage || rawCoverage.schema !== RESULT_COVERAGE_SCHEMA) return unavailable(input.runStatus, "INVALID", "Current measurement coverage is missing or unsupported.");
  const covered = categoryList(rawCoverage.coveredCategories);
  const missing = categoryList(rawCoverage.unavailableCategories);
  const measurementIds = Array.isArray(rawCoverage.measurementIds) && rawCoverage.measurementIds.every((item) => typeof item === "string" && item.length > 0)
    ? rawCoverage.measurementIds as string[] : null;
  const limitations = Array.isArray(rawCoverage.limitations) && rawCoverage.limitations.every((item) => typeof item === "string")
    ? rawCoverage.limitations as string[] : null;
  const seoFiles = record(summary.seoFiles);
  const robots = seoFiles ? record(seoFiles.robots) : null;
  const sitemap = seoFiles ? record(seoFiles.sitemap) : null;
  const seoEvidenceComplete = [robots?.status, sitemap?.status].every((status) => status === "VERIFIED" || status === "MISSING");
  const expectedCoveredCategories = [...(seoEvidenceComplete ? ["SEO" as const] : []), ...CURRENT_ALWAYS_COVERED_CATEGORIES];
  if (
    !covered || !missing || !measurementIds || !limitations
    || new Set(measurementIds).size !== measurementIds.length
    || measurementIds.length !== covered.length
    || covered.some((category) => !measurementIds.includes(`category:${category}`))
    || !finiteRatio(rawCoverage.ratio) || !finiteRatio(rawCoverage.confidence)
    || (rawCoverage.freshness !== "FRESH" && rawCoverage.freshness !== "STALE_BLOCKED")
    || covered.some((category) => missing.includes(category))
    || new Set([...covered, ...missing]).size !== RESULT_CATEGORIES.length
    || Math.abs(rawCoverage.ratio - covered.length / RESULT_CATEGORIES.length) > 0.000001
    || Math.abs(rawCoverage.confidence - rawCoverage.ratio) > 0.000001
    || covered.length !== expectedCoveredCategories.length
    || expectedCoveredCategories.some((category) => !covered.includes(category))
  ) return unavailable(input.runStatus, "INVALID", "Measurement coverage is malformed or contradictory.");

  if (rawCoverage.freshness === "STALE_BLOCKED") return unavailable(input.runStatus, "UNAVAILABLE", "Measurement evidence is stale and blocked.");
  const coverage: ResultCoverage = {
    ratio: rawCoverage.ratio,
    confidence: rawCoverage.confidence,
    freshness: "FRESH",
    coveredCategories: covered,
    unavailableCategories: missing,
    limitations,
  };
  if (covered.length === 0) return { ...unavailable(input.runStatus, "UNAVAILABLE", "No measurement category completed."), coverage };

  const categoryScores = unavailableCategories();
  for (const category of covered) categoryScores[category] = calculated.categories[category];
  const availability: ResultAvailability = missing.length === 0 ? "AVAILABLE" : "PARTIAL";
  return {
    processingStatus: input.runStatus,
    availability,
    score: calculated,
    categoryScores,
    coverage,
    withheldReason: null,
    policyVersion: persisted.policyVersion,
    comparable: availability === "AVAILABLE" || availability === "PARTIAL",
  };
}
