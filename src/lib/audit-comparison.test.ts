import { describe, it, expect } from "vitest";
import { compareAuditRuns } from "./audit-comparison";
import type { AuditRun } from "./audit-comparison";
import type { FindingCategory, FindingSeverity } from "./types";

function makeFinding(code: string, category: string, severity: string) {
  return { code, category: category as FindingCategory, severity: severity as FindingSeverity, title: `${code} title` };
}

function makeRun(findings: ReturnType<typeof makeFinding>[]): AuditRun {
  return { findings };
}

describe("audit-comparison", () => {
  it("identifies improved score", () => {
    const runA = makeRun([makeFinding("F1", "SEO", "HIGH")]);
    const runB = makeRun([]);
    const result = compareAuditRuns(runA, runB);
    expect(result.overall.direction).toBe("improved");
    expect(result.overall.delta).toBeGreaterThan(0);
  });

  it("identifies regressed score", () => {
    const runA = makeRun([]);
    const runB = makeRun([makeFinding("F1", "SEO", "HIGH")]);
    const result = compareAuditRuns(runA, runB);
    expect(result.overall.direction).toBe("regressed");
    expect(result.overall.delta).toBeLessThan(0);
  });

  it("identifies stable score", () => {
    const runA = makeRun([makeFinding("F1", "SEO", "MEDIUM")]);
    const runB = makeRun([makeFinding("F1", "SEO", "MEDIUM")]);
    const result = compareAuditRuns(runA, runB);
    expect(result.overall.direction).toBe("stable");
    expect(result.overall.delta).toBe(0);
  });

  it("finds new issues", () => {
    const runA = makeRun([makeFinding("F1", "SEO", "HIGH")]);
    const runB = makeRun([
      makeFinding("F1", "SEO", "HIGH"),
      makeFinding("F2", "SECURITY", "CRITICAL"),
    ]);
    const result = compareAuditRuns(runA, runB);
    expect(result.newIssues).toHaveLength(1);
    expect(result.newIssues[0].code).toBe("F2");
  });

  it("finds resolved issues", () => {
    const runA = makeRun([
      makeFinding("F1", "SEO", "HIGH"),
      makeFinding("F2", "SECURITY", "CRITICAL"),
    ]);
    const runB = makeRun([makeFinding("F1", "SEO", "HIGH")]);
    const result = compareAuditRuns(runA, runB);
    expect(result.resolvedIssues).toHaveLength(1);
    expect(result.resolvedIssues[0].code).toBe("F2");
  });

  it("finds unchanged issues", () => {
    const runA = makeRun([
      makeFinding("F1", "SEO", "HIGH"),
      makeFinding("F2", "SECURITY", "MEDIUM"),
    ]);
    const runB = makeRun([
      makeFinding("F1", "SEO", "HIGH"),
      makeFinding("F2", "SECURITY", "MEDIUM"),
    ]);
    const result = compareAuditRuns(runA, runB);
    expect(result.unchangedIssues).toHaveLength(2);
  });

  it("calculates category deltas", () => {
    const runA = makeRun([makeFinding("F1", "SEO", "HIGH")]);
    const runB = makeRun([makeFinding("F1", "SEO", "LOW")]);
    const result = compareAuditRuns(runA, runB);
    const seoCat = result.categories.find((c) => c.category === "SEO");
    expect(seoCat).toBeDefined();
    expect(seoCat!.direction).toBe("improved");
  });

  it("handles empty runs", () => {
    const runA = makeRun([]);
    const runB = makeRun([]);
    const result = compareAuditRuns(runA, runB);
    expect(result.overall.direction).toBe("stable");
    expect(result.newIssues).toHaveLength(0);
    expect(result.resolvedIssues).toHaveLength(0);
    expect(result.unchangedIssues).toHaveLength(0);
  });
});
