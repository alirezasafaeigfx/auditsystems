import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type FindingItem = {
  code: string;
  title: string;
  severity: string;
  recommendation?: string | null;
};

export async function buildAuditReportPdf(input: {
  reportTitle: string;
  targetUrl: string;
  status: string;
  findings: FindingItem[];
  generatedAt: string;
  locale?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Enhanced RTL support for proper text direction
  const isRtl = input.locale === "fa" || input.locale === "ar";
  const margin = isRtl ? 515 : 40; // Right margin for RTL, left for LTR

  // Simple RTL text handling - for full bidi shaping, consider using a dedicated library
  // This version handles basic RTL text direction and margin positioning
  function applyBidi(text: string): string {
    if (!isRtl) return text;
    
    // For now, return text as-is but position it correctly with RTL margin
    // Full bidi shaping would require a library like bidi-js or pdfkit with bidi support
    return text;
  }

  let y = 800;

  function draw(text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }): void {
    const size = opts?.size ?? 12;
    const selectedFont = opts?.bold ? bold : font;
    const colorTuple = opts?.color ?? [0, 0, 0];

    // Apply bidi processing for RTL text
    const displayText = applyBidi(text);

    page.drawText(displayText, {
      x: margin,
      y,
      size,
      font: selectedFont,
      color: rgb(colorTuple[0], colorTuple[1], colorTuple[2])
    });
    y -= size + 8;
  }

  function drawWrapped(text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }): void {
    // For RTL text, we need to handle word breaking differently
    if (isRtl) {
      // Simple character-based wrapping for RTL (can be improved with proper Arabic word breaking)
      const maxCharsPerLine = 50; // Fewer characters for RTL to account for bidi complexity
      for (let i = 0; i < text.length; i += maxCharsPerLine) {
        const line = text.slice(i, i + maxCharsPerLine);
        draw(line, opts);
      }
    } else {
      // LTR word-based wrapping
      const words = text.split(" ");
      let line = "";

      for (const word of words) {
        const testLine = line + (line ? " " : "") + word;
        if (testLine.length > 60) { // Approximate character limit per line
          draw(line, opts);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) draw(line, opts);
    }
  }

  draw(input.reportTitle, { size: 20, bold: true });
  draw(`Target: ${input.targetUrl}`);
  draw(`Status: ${input.status}`);
  draw(`Generated: ${input.generatedAt}`);

  y -= 8;
  draw("Top Findings", { size: 14, bold: true });

  const findings = input.findings.slice(0, 20);
  if (findings.length === 0) {
    draw("No findings available.");
  }

  for (const finding of findings) {
    if (y < 80) {
      y = 800;
      page = pdf.addPage([595, 842]);
      page.drawText("Continued findings", {
        x: margin,
        y,
        size: 14,
        font: bold,
        color: rgb(0, 0, 0)
      });
      y -= 28;
    }

    draw(`[${finding.severity}] ${finding.code} - ${finding.title}`, { size: 11, bold: true });
    if (finding.recommendation) {
      drawWrapped(`Recommendation: ${finding.recommendation}`, { size: 10, color: [0.2, 0.2, 0.2] });
    }
    y -= 4;
  }

  return pdf.save();
}
