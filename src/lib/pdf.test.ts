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
    expect(pdfBytes.length).toBeGreaterThan(100); // PDF should have some content
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
    expect(pdfBytes.length).toBeGreaterThan(200); // Should be larger with findings
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
    expect(pdfBytes.length).toBeGreaterThan(1000); // Should be much larger with pagination
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
    expect(pdfBytes.length).toBeGreaterThan(300); // Should be larger with wrapped text
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
});
