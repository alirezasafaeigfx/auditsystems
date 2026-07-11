import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

const schema = JSON.parse(
  readFileSync(resolve(__dirname, "../../../schema/seo-audit-evidence.v1.schema.json"), "utf8"),
) as Record<string, unknown>;

function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function basePayload(): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0",
    auditId: "audit-test-001",
    generatedAt: "2026-07-10T20:00:00Z",
    evidence: [
      {
        id: "ev-1",
        schemaVersion: "1.0.0",
        methodVersion: "1.0",
        evidenceClass: "MEASURED",
        source: "lighthouse",
        collectedAt: "2026-07-10T20:00:00Z",
        requestedUrl: "https://example.com",
        scope: "performance",
        status: "SUCCESS",
        confidence: 0.95,
        summary: "LCP measured at 2.1s",
        limitations: [],
      },
    ],
    findings: [
      {
        id: "f-1",
        ruleId: "perf-lcp",
        ruleVersion: "1.0",
        title: "LCP exceeds 2.5s threshold",
        severity: "HIGH",
        status: "CONFIRMED",
        evidenceIds: ["ev-1"],
        impact: "Slow loading affects user experience",
        recommendation: "Optimize largest contentful paint element",
        verificationMethod: "Lighthouse performance audit",
        limitations: [],
        affectedUrls: ["https://example.com"],
      },
    ],
    metrics: [
      {
        key: "lcp",
        label: "Largest Contentful Paint",
        value: 2.1,
        unit: "s",
        evidenceClass: "MEASURED",
        evidenceIds: ["ev-1"],
        strategy: "lighthouse-lab",
        coverage: 1.0,
        status: "SUCCESS",
        limitations: [],
      },
    ],
    scores: [
      {
        policyVersion: "1.0",
        category: "performance",
        weight: 0.3,
        coverage: 1.0,
        confidence: 0.95,
        deductions: [],
        credits: [],
        unknownRules: [],
      },
    ],
  };
}

describe("SEO Audit Evidence Contract v1", () => {
  const validate = createValidator();

  it("accepts valid payload with measured and observed evidence", () => {
    const payload = basePayload();
    (payload.evidence as Record<string, unknown>[]).push({
      id: "ev-2",
      schemaVersion: "1.0.0",
      methodVersion: "1.0",
      evidenceClass: "OBSERVED",
      source: "html-inspection",
      collectedAt: "2026-07-10T20:00:00Z",
      requestedUrl: "https://example.com",
      scope: "meta-tags",
      status: "SUCCESS",
      confidence: 0.8,
      summary: "Title tag present",
      limitations: ["manual review required"],
    });
    expect(validate(payload)).toBe(true);
  });

  it("accepts UNAVAILABLE metric with null value", () => {
    const payload = basePayload();
    (payload.metrics as Record<string, unknown>[])[0] = {
      key: "cls",
      label: "Cumulative Layout Shift",
      value: null,
      unit: null,
      evidenceClass: "UNAVAILABLE",
      evidenceIds: [],
      strategy: "not-collected",
      coverage: 0,
      status: "UNAVAILABLE",
      limitations: ["CrUX data not available"],
    };
    expect(validate(payload)).toBe(true);
  });

  it("rejects UNAVAILABLE metric with numeric value", () => {
    const payload = basePayload();
    (payload.metrics as Record<string, unknown>[])[0] = {
      key: "cls",
      label: "CLS",
      value: 0.1,
      unit: "",
      evidenceClass: "UNAVAILABLE",
      evidenceIds: [],
      strategy: "est",
      coverage: 0.5,
      status: "UNAVAILABLE",
      limitations: [],
    };
    expect(validate(payload)).toBe(false);
  });

  it("rejects CONFIRMED finding without evidence IDs", () => {
    const payload = basePayload();
    (payload.findings as Record<string, unknown>[])[0].evidenceIds = [];
    expect(validate(payload)).toBe(false);
  });

  it("accepts score withheld due to low coverage", () => {
    const payload = basePayload();
    (payload.scores as Record<string, unknown>[])[0].coverage = 0.2;
    (payload.scores as Record<string, unknown>[])[0].withheldReason =
      "Coverage below 50% threshold";
    expect(validate(payload)).toBe(true);
  });

  it("accepts HEURISTIC evidence without converting to MEASURED", () => {
    const payload = basePayload();
    (payload.evidence as Record<string, unknown>[])[0].evidenceClass =
      "HEURISTIC";
    (payload.evidence as Record<string, unknown>[])[0].confidence = 0.5;
    (payload.evidence as Record<string, unknown>[])[0].summary =
      "Estimated from similar sites";
    expect(validate(payload)).toBe(true);
  });

  it("accepts INFERRED finding without evidence IDs", () => {
    const payload = basePayload();
    (payload.findings as Record<string, unknown>[])[0].status = "INFERRED";
    (payload.findings as Record<string, unknown>[])[0].evidenceIds = [];
    expect(validate(payload)).toBe(true);
  });
});
