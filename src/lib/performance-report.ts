import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PerformanceEvidenceBundle, PerformanceEvidenceMetric } from "./performance-evidence";

function formatValue(metric: PerformanceEvidenceMetric): string {
  if (metric.value === null) return "Unavailable";
  if (metric.unit === "score") return metric.value.toFixed(2);
  return `${Math.round(metric.value)} ${metric.unit}`;
}

function percent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function formatPerformanceEvidenceLines(performance: PerformanceEvidenceBundle): string[] {
  const lines: string[] = [
    `Collected: ${performance.collectedAt}`,
    `Coverage: ${percent(performance.coverage.overall)} | Confidence: ${percent(performance.confidence)}`,
    `Performance score: Withheld - ${performance.withheldReason}`,
  ];

  for (const result of performance.providerResults) {
    lines.push(`Provider: ${result.provider} | Strategy: ${result.strategy} | Status: ${result.status}`);
    lines.push("Field (CrUX)");
    for (const metric of result.fieldMetrics) {
      lines.push(`${metric.key.toUpperCase()}: ${formatValue(metric)} [${metric.evidenceClass}]`);
      if (metric.value === null) lines.push(`Next action: collect sufficient CrUX field coverage for ${metric.label}.`);
    }
    lines.push(`Lab (Lighthouse ${result.strategy})`);
    for (const metric of result.labMetrics) {
      lines.push(`${metric.key.toUpperCase()}: ${formatValue(metric)} [${metric.evidenceClass}]`);
      if (metric.value === null) lines.push(`Next action: rerun bounded Lighthouse ${result.strategy} collection for ${metric.label}.`);
    }
  }

  lines.push("Local diagnostics (not Core Web Vitals measurements)");
  for (const metric of performance.diagnostics.metrics) {
    const value = metric.value === null ? "Unavailable" : `${metric.value} ${metric.unit}`;
    lines.push(`${metric.label}: ${value} [OBSERVED]`);
  }

  for (const limitation of performance.limitations.slice(0, 6)) {
    lines.push(`Limitation: ${limitation}`);
  }
  return lines;
}

export async function appendPerformanceEvidencePage(
  pdfBytes: Uint8Array,
  performance?: PerformanceEvidenceBundle,
): Promise<Uint8Array> {
  if (!performance) return pdfBytes;
  const pdf = await PDFDocument.load(pdfBytes);
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  page.drawText("Performance Evidence", {
    x: 40,
    y,
    size: 18,
    font: bold,
    color: rgb(0.05, 0.2, 0.45),
  });
  y -= 30;

  for (const sourceLine of formatPerformanceEvidenceLines(performance)) {
    const line = sourceLine.length > 90 ? `${sourceLine.slice(0, 87)}...` : sourceLine;
    if (y < 45) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(line, {
      x: 40,
      y,
      size: 9,
      font: sourceLine.startsWith("Field (") || sourceLine.startsWith("Lab (") || sourceLine.startsWith("Provider:")
        ? bold
        : font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 14;
  }

  return pdf.save();
}
