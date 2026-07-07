import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type FindingItem = {
  code: string;
  title: string;
  severity: string;
  recommendation?: string | null;
  category?: string;
  effort?: string;
  impact?: string;
};

type ScoreData = {
  overall: number;
  grade: "EXCELLENT" | "GOOD" | "NEEDS_WORK" | "CRITICAL";
  categories: Record<string, number>;
  severityCounts: Record<string, number>;
  totalFindings: number;
};

type ActionPlanItem = {
  effort: string;
  impact: string;
  title: string;
};

export async function buildAuditReportPdf(input: {
  reportTitle: string;
  targetUrl: string;
  status: string;
  findings: FindingItem[];
  generatedAt: string;
  locale?: string;
  score?: ScoreData;
  agencyName?: string;
  agencyLogo?: string;
  agencyContact?: string;
  primaryColor?: [number, number, number];
  secondaryColor?: [number, number, number];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const isRtl = input.locale === "fa" || input.locale === "ar";
  const margin = isRtl ? 515 : 40;

  function applyBidi(text: string): string {
    if (!isRtl) return text;
    return text;
  }

  let y = 800;

  function draw(text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }): void {
    const size = opts?.size ?? 12;
    const selectedFont = opts?.bold ? bold : font;
    const colorTuple = opts?.color ?? [0, 0, 0];
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
    if (isRtl) {
      const maxCharsPerLine = 50;
      for (let i = 0; i < text.length; i += maxCharsPerLine) {
        const line = text.slice(i, i + maxCharsPerLine);
        draw(line, opts);
      }
    } else {
      const words = text.split(" ");
      let line = "";

      for (const word of words) {
        const testLine = line + (line ? " " : "") + word;
        if (testLine.length > 60) {
          draw(line, opts);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) draw(line, opts);
    }
  }

  function drawLine(x1: number, y1: number, x2: number, y2: number, color: [number, number, number] = [0.8, 0.8, 0.8]): void {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: rgb(color[0], color[1], color[2])
    });
  }

  function drawRect(x: number, y: number, width: number, height: number, color: [number, number, number]): void {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(color[0], color[1], color[2])
    });
  }

  function getGradeColor(grade: string): [number, number, number] {
    switch (grade) {
      case "EXCELLENT": return [0.13, 0.55, 0.13];
      case "GOOD": return [0.0, 0.45, 0.75];
      case "NEEDS_WORK": return [0.85, 0.55, 0.05];
      case "CRITICAL": return [0.8, 0.1, 0.1];
      default: return [0.5, 0.5, 0.5];
    }
  }

  function getSeverityColor(severity: string): [number, number, number] {
    switch (severity) {
      case "CRITICAL": return [0.8, 0.1, 0.1];
      case "HIGH": return [0.9, 0.4, 0.0];
      case "MEDIUM": return [0.85, 0.55, 0.05];
      case "LOW": return [0.0, 0.45, 0.75];
      case "INFO": return [0.5, 0.5, 0.5];
      default: return [0.5, 0.5, 0.5];
    }
  }

  function newPage(): void {
    y = 800;
    page = pdf.addPage([595, 842]);
  }

  const headerColor = input.primaryColor ?? [0.4, 0.4, 0.4];
  const accentColor = input.secondaryColor ?? [0.02, 0.59, 0.41];

  // --- Professional Header ---
  if (input.agencyName) {
    draw(input.agencyName, { size: 10, color: headerColor });
    y -= 4;
  }

  drawLine(40, y, 555, y, headerColor);
  y -= 20;

  // --- Report Title ---
  draw(input.reportTitle, { size: 22, bold: true });
  y -= 4;

  // --- Target URL ---
  draw(`Target: ${input.targetUrl}`, { size: 11, color: [0.3, 0.3, 0.3] });
  draw(`Status: ${input.status} | Generated: ${input.generatedAt}`, { size: 10, color: [0.4, 0.4, 0.4] });
  y -= 12;

  drawLine(40, y, 555, y);
  y -= 24;

  // --- Score Badge Section ---
  if (input.score) {
    const score = input.score;
    const gradeColor = getGradeColor(score.grade);

    // Draw score badge background
    drawRect(40, y - 60, 160, 80, [0.96, 0.96, 0.96]);
    drawRect(40, y - 60, 160, 4, gradeColor);

    // Score number
    page.drawText(String(score.overall), {
      x: 90,
      y: y - 35,
      size: 32,
      font: bold,
      color: rgb(gradeColor[0], gradeColor[1], gradeColor[2])
    });
    page.drawText("/100", {
      x: 140,
      y: y - 28,
      size: 14,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });

    // Grade label
    page.drawText(score.grade.replace("_", " "), {
      x: 65,
      y: y - 55,
      size: 12,
      font: bold,
      color: rgb(gradeColor[0], gradeColor[1], gradeColor[2])
    });

    // Total findings
    page.drawText(`${score.totalFindings} findings`, {
      x: 65,
      y: y - 70,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });

    y -= 90;

    // --- Severity Counts ---
    draw("Severity Breakdown", { size: 12, bold: true });
    y -= 4;

    const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
    let xOffset = 40;

    for (const sev of severities) {
      const count = score.severityCounts[sev] ?? 0;
      const color = getSeverityColor(sev);

      drawRect(xOffset, y - 24, 90, 28, [0.96, 0.96, 0.96]);
      drawRect(xOffset, y - 24, 90, 3, color);

      page.drawText(sev, {
        x: xOffset + 8,
        y: y - 14,
        size: 8,
        font: bold,
        color: rgb(color[0], color[1], color[2])
      });
      page.drawText(String(count), {
        x: xOffset + 35,
        y: y - 28,
        size: 14,
        font: bold,
        color: rgb(color[0], color[1], color[2])
      });

      xOffset += 100;
    }

    y -= 44;

    // --- Category Scores ---
    draw("Category Scores", { size: 12, bold: true });
    y -= 4;

    const categories = Object.entries(score.categories);
    for (const [cat, catScore] of categories) {
      if (y < 60) newPage();

      const barWidth = (catScore / 100) * 200;
      const barColor: [number, number, number] = catScore >= 80 ? [0.13, 0.55, 0.13] : catScore >= 60 ? [0.85, 0.55, 0.05] : [0.8, 0.1, 0.1];

      page.drawText(cat, {
        x: 40,
        y: y - 4,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3)
      });

      drawRect(170, y - 12, 200, 10, [0.92, 0.92, 0.92]);
      drawRect(170, y - 12, barWidth, 10, barColor);

      page.drawText(`${catScore}/100`, {
        x: 380,
        y: y - 4,
        size: 10,
        font: bold,
        color: rgb(0.3, 0.3, 0.3)
      });

      y -= 22;
    }

    y -= 16;
    drawLine(40, y, 555, y);
    y -= 24;
  }

  // --- Top 3 Critical Issues ---
  const criticalFindings = input.findings
    .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
    .slice(0, 3);

  if (criticalFindings.length > 0) {
    if (y < 150) newPage();

    draw("Critical Issues", { size: 14, bold: true, color: accentColor });
    y -= 4;

    for (const finding of criticalFindings) {
      if (y < 100) newPage();

      const sevColor = getSeverityColor(finding.severity);
      drawRect(40, y - 50, 515, 54, [1, 0.95, 0.95]);
      drawRect(40, y - 50, 4, 54, sevColor);

      page.drawText(`[${finding.severity}]`, {
        x: 52,
        y: y - 10,
        size: 10,
        font: bold,
        color: rgb(sevColor[0], sevColor[1], sevColor[2])
      });
      page.drawText(finding.title, {
        x: 110,
        y: y - 10,
        size: 11,
        font: bold,
        color: rgb(0.1, 0.1, 0.1)
      });

      if (finding.recommendation) {
        const recText = finding.recommendation.length > 80
          ? finding.recommendation.slice(0, 80) + "..."
          : finding.recommendation;
        page.drawText(recText, {
          x: 52,
          y: y - 28,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      y -= 62;
    }

    y -= 8;
    drawLine(40, y, 555, y);
    y -= 24;
  }

  // --- Action Plan (Effort x Impact Quadrants) ---
  if (input.findings.length > 0) {
    if (y < 200) newPage();

    draw("Action Plan", { size: 14, bold: true, color: accentColor });
    y -= 4;
    draw("Prioritize fixes by effort and impact", { size: 9, color: headerColor });
    y -= 12;

    const actionPlanItems: ActionPlanItem[] = input.findings.map((f) => ({
      effort: f.effort ?? "MEDIUM",
      impact: f.impact ?? "MEDIUM",
      title: f.title
    }));

    const quickWins = actionPlanItems.filter((i) => i.effort === "LOW" && i.impact === "HIGH");
    const majorProjects = actionPlanItems.filter((i) => i.effort === "HIGH" && i.impact === "HIGH");
    const fillIns = actionPlanItems.filter((i) => i.effort === "LOW" && i.impact === "LOW");
    const thankless = actionPlanItems.filter((i) => i.effort === "HIGH" && i.impact === "LOW");

    const quadrants = [
      { label: "Quick Wins (Do First)", items: quickWins, color: [0.13, 0.55, 0.13] as [number, number, number] },
      { label: "Major Projects (Plan)", items: majorProjects, color: [0.0, 0.45, 0.75] as [number, number, number] },
      { label: "Fill-ins (Opportunistic)", items: fillIns, color: [0.85, 0.55, 0.05] as [number, number, number] },
      { label: "Thankless Tasks (Deprioritize)", items: thankless, color: [0.5, 0.5, 0.5] as [number, number, number] }
    ];

    for (const quadrant of quadrants) {
      if (y < 80) newPage();

      draw(quadrant.label, { size: 11, bold: true, color: quadrant.color });

      if (quadrant.items.length === 0) {
        page.drawText("None identified", {
          x: margin + 10,
          y: y - 2,
          size: 9,
          font,
          color: rgb(0.6, 0.6, 0.6)
        });
        y -= 18;
      } else {
        for (const item of quadrant.items.slice(0, 3)) {
          const titleText = item.title.length > 70 ? item.title.slice(0, 70) + "..." : item.title;
          page.drawText(`• ${titleText}`, {
            x: margin + 10,
            y: y - 2,
            size: 9,
            font,
            color: rgb(0.3, 0.3, 0.3)
          });
          y -= 16;
        }
        if (quadrant.items.length > 3) {
          page.drawText(`  ...and ${quadrant.items.length - 3} more`, {
            x: margin + 10,
            y: y - 2,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5)
          });
          y -= 14;
        }
      }
      y -= 6;
    }

    y -= 8;
    drawLine(40, y, 555, y);
    y -= 24;
  }

  // --- Full Findings List ---
  if (y < 150) newPage();

  draw("All Findings", { size: 14, bold: true, color: accentColor });
  y -= 8;

  const findings = input.findings.slice(0, 30);
  if (findings.length === 0) {
    draw("No findings available.");
  }

  for (const finding of findings) {
    if (y < 80) {
      newPage();
      draw("Continued findings", { size: 12, bold: true });
      y -= 8;
    }

    draw(`[${finding.severity}] ${finding.code} - ${finding.title}`, { size: 10, bold: true });
    if (finding.recommendation) {
      drawWrapped(`Recommendation: ${finding.recommendation}`, { size: 9, color: [0.3, 0.3, 0.3] });
    }
    y -= 6;
  }

  // --- Agency Footer ---
  if (input.agencyName) {
    y -= 16;
    if (y < 60) newPage();
    drawLine(40, y, 555, y, headerColor);
    y -= 16;

    draw(input.agencyName, { size: 9, color: headerColor });
    if (input.agencyContact) {
      draw(input.agencyContact, { size: 8, color: accentColor });
    }
  }

  return pdf.save();
}
