import { describe, expect, it } from "vitest";
import { buildAuditReportPdf } from "./pdf";

describe("buildAuditReportPdf", () => {
  it("generates PDF with basic information", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);
  });

  it("generates PDF with findings", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [
        {
          code: "TEST_FINDING",
          title: "Test Finding",
          severity: "HIGH",
          recommendation: "Fix this issue"
        }
      ],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(200);
  });

  it("generates PDF with many findings (pagination)", async () => {
    const findings = Array.from({ length: 25 }, (_, i) => ({
      code: `FINDING_${i}`,
      title: `Finding ${i}`,
      severity: "MEDIUM" as const,
      recommendation: `Recommendation ${i}`
    }));

    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings,
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("handles RTL locale parameter", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [],
      generatedAt: "2024-01-01T00:00:00.000Z",
      locale: "fa"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);
  });

  it("handles long recommendations with text wrapping", async () => {
    const longRecommendation = "This is a very long recommendation that should be wrapped across multiple lines in the PDF document to ensure proper formatting and readability.";

    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [
        {
          code: "LONG_RECOMMENDATION",
          title: "Finding with Long Recommendation",
          severity: "MEDIUM",
          recommendation: longRecommendation
        }
      ],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(300);
  });

  it("generates PDF with empty findings list", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);
  });

  it("handles findings without recommendations", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [
        {
          code: "NO_RECOMMENDATION",
          title: "Finding Without Recommendation",
          severity: "LOW",
          recommendation: null
        }
      ],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(200);
  });

  it("handles different severity levels", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [
        {
          code: "HIGH_SEVERITY",
          title: "High Severity Issue",
          severity: "HIGH",
          recommendation: "Fix immediately"
        },
        {
          code: "MEDIUM_SEVERITY",
          title: "Medium Severity Issue",
          severity: "MEDIUM",
          recommendation: "Fix soon"
        },
        {
          code: "LOW_SEVERITY",
          title: "Low Severity Issue",
          severity: "LOW",
          recommendation: "Fix when possible"
        }
      ],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(300);
  });

  it("generates PDF with score data", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [
        { code: "FINDING_1", title: "Critical Issue", severity: "CRITICAL", recommendation: "Fix now", category: "SECURITY" },
        { code: "FINDING_2", title: "High Issue", severity: "HIGH", recommendation: "Fix soon", category: "PERFORMANCE" },
        { code: "FINDING_3", title: "Medium Issue", severity: "MEDIUM", recommendation: "Fix later", category: "SEO" }
      ],
      generatedAt: "2024-01-01T00:00:00.000Z",
      score: {
        overall: 65,
        grade: "GOOD",
        categories: { SECURITY: 50, PERFORMANCE: 70, SEO: 80, UX: 90, ACCESSIBILITY: 85, RESILIENCE: 75 },
        severityCounts: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 0, INFO: 0 },
        totalFindings: 3
      }
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1500);
  });

  it("generates PDF with agency branding", async () => {
    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings: [],
      generatedAt: "2024-01-01T00:00:00.000Z",
      agencyName: "Test Agency",
      agencyContact: "contact@testagency.com"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(200);
  });

  it("generates PDF with action plan quadrants", async () => {
    const findings = [
      { code: "QUICK_WIN", title: "Quick Win Issue", severity: "HIGH", recommendation: "Easy fix with high impact", category: "SECURITY" },
      { code: "MAJOR_PROJECT", title: "Major Project Issue", severity: "CRITICAL", recommendation: "Hard fix with high impact", category: "PERFORMANCE" },
      { code: "FILL_IN", title: "Fill-in Issue", severity: "LOW", recommendation: "Easy fix with low impact", category: "SEO" },
      { code: "THANKLESS", title: "Thankless Task", severity: "MEDIUM", recommendation: "Hard fix with low impact", category: "UX" }
    ];

    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings,
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(800);
  });

  it("generates PDF with critical issues highlighted", async () => {
    const findings = [
      { code: "CRIT_1", title: "Critical Security Flaw", severity: "CRITICAL", recommendation: "Immediate fix required", category: "SECURITY" },
      { code: "HIGH_1", title: "High Performance Issue", severity: "HIGH", recommendation: "Fix within 24 hours", category: "PERFORMANCE" },
      { code: "MED_1", title: "Medium SEO Issue", severity: "MEDIUM", recommendation: "Fix this week", category: "SEO" }
    ];

    const pdfBytes = await buildAuditReportPdf({
      reportTitle: "Test Audit Report",
      targetUrl: "https://example.com",
      status: "SUCCEEDED",
      findings,
      generatedAt: "2024-01-01T00:00:00.000Z",
      score: {
        overall: 45,
        grade: "NEEDS_WORK",
        categories: { SECURITY: 30, PERFORMANCE: 50, SEO: 60, UX: 70, ACCESSIBILITY: 80, RESILIENCE: 40 },
        severityCounts: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 0, INFO: 0 },
        totalFindings: 3
      }
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1500);
  });
});
