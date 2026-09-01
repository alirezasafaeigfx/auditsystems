import { prisma } from "./db";
import { calculateScore } from "./scoring";
import { CURRENT_SCORING_POLICY_VERSION } from "./persisted-score";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type MonthlyReportData = {
  organizationId: string;
  organizationName: string;
  month: number;
  year: number;
  scoringPolicyVersion: string;
  totalAudits: number;
  successfulAudits: number;
  averageScore: number;
  scoreBreakdown: {
    overall: number;
    grade: string;
    categories: Record<string, number>;
    severityCounts: Record<string, number>;
    totalFindings: number;
  };
  topIssues: { code: string; title: string; severity: string; count: number }[];
  improvements: { category: string; before: number; after: number }[];
  projectBreakdown: { projectId: string; projectName: string; auditCount: number; avgScore: number }[];
};

function gradeFromScore(score: number): string {
  if (score >= 81) return "EXCELLENT";
  if (score >= 61) return "GOOD";
  if (score >= 41) return "NEEDS_WORK";
  return "CRITICAL";
}

export async function generateMonthlyReport(
  organizationId: string,
  month: number,
  year: number
): Promise<{ markdown: string; pdf: Uint8Array; data: MonthlyReportData }> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  });
  if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const audits = await prisma.auditRun.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDate, lte: endDate },
      status: "SUCCEEDED"
    },
    include: {
      findings: true,
      project: true
    }
  });

  const allAudits = await prisma.auditRun.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDate, lte: endDate }
    }
  });

  const totalAudits = allAudits.length;
  const successfulAudits = audits.length;

  let totalScore = 0;
  const allFindings: { category: string; severity: string }[] = [];
  const issueMap = new Map<string, { code: string; title: string; severity: string; count: number }>();
  const projectMap = new Map<string, { projectId: string; projectName: string; auditCount: number; totalScore: number }>();
  const auditScores: ReturnType<typeof calculateScore>[] = [];

  for (const audit of audits) {
    const findings = audit.findings.map((f) => ({
      category: f.category,
      severity: f.severity
    }));

    const score = calculateScore(findings as { category: never; severity: never }[]);
    totalScore += score.overall;
    auditScores.push(score);
    allFindings.push(...findings);

    for (const finding of audit.findings) {
      const key = finding.code;
      const existing = issueMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        issueMap.set(key, {
          code: finding.code,
          title: finding.title,
          severity: finding.severity,
          count: 1
        });
      }
    }

    if (audit.project) {
      const projectKey = audit.project.id;
      const existing = projectMap.get(projectKey);
      if (existing) {
        existing.auditCount++;
        existing.totalScore += score.overall;
      } else {
        projectMap.set(projectKey, {
          projectId: audit.project.id,
          projectName: audit.project.name,
          auditCount: 1,
          totalScore: score.overall
        });
      }
    }
  }

  const averageScore = successfulAudits > 0 ? Math.round(totalScore / successfulAudits) : 0;
  const calculatedBreakdown = calculateScore(allFindings as { category: never; severity: never }[]);
  const scoreBreakdown = auditScores.length === 0
    ? calculatedBreakdown
    : {
      ...calculatedBreakdown,
      overall: Math.round(totalScore / auditScores.length),
      grade: gradeFromScore(Math.round(totalScore / auditScores.length)),
      categories: Object.fromEntries(Object.keys(calculatedBreakdown.categories).map((category) => [
        category,
        Math.round(auditScores.reduce((sum, score) => sum + score.categories[category as keyof typeof score.categories], 0) / auditScores.length),
      ])) as typeof calculatedBreakdown.categories,
    };

  const topIssues = Array.from(issueMap.values())
    .sort((a, b) => {
      const severityOrder: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
      return (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0) || b.count - a.count;
    })
    .slice(0, 10);

  const projectBreakdown = Array.from(projectMap.values()).map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    auditCount: p.auditCount,
    avgScore: Math.round(p.totalScore / p.auditCount)
  }));

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const prevStartDate = new Date(previousYear, previousMonth - 1, 1);
  const prevEndDate = new Date(previousYear, previousMonth, 0, 23, 59, 59, 999);

  const previousAudits = await prisma.auditRun.findMany({
    where: {
      organizationId,
      createdAt: { gte: prevStartDate, lte: prevEndDate },
      status: "SUCCEEDED"
    },
    include: { findings: true }
  });

  const categoryScores: Record<string, { current: number; previous: number }> = {};
  for (const cat of Object.keys(scoreBreakdown.categories)) {
    const current = scoreBreakdown.categories[cat as keyof typeof scoreBreakdown.categories] ?? 0;
    const previousScores = previousAudits.map((audit) => calculateScore(
      audit.findings.map((f) => ({ category: f.category, severity: f.severity })) as { category: never; severity: never }[],
    ));
    categoryScores[cat] = {
      current,
      previous: previousScores.length > 0
        ? Math.round(previousScores.reduce((sum, score) => sum + score.categories[cat as keyof typeof score.categories], 0) / previousScores.length)
        : current
    };
  }

  const improvements = Object.entries(categoryScores)
    .filter(([, scores]) => scores.current > scores.previous)
    .map(([category, scores]) => ({
      category,
      before: scores.previous,
      after: scores.current
    }));

  const reportData: MonthlyReportData = {
    organizationId,
    organizationName: organization.name,
    month,
    year,
    scoringPolicyVersion: CURRENT_SCORING_POLICY_VERSION,
    totalAudits,
    successfulAudits,
    averageScore,
    scoreBreakdown: {
      overall: scoreBreakdown.overall,
      grade: scoreBreakdown.grade,
      categories: scoreBreakdown.categories as Record<string, number>,
      severityCounts: scoreBreakdown.severityCounts as Record<string, number>,
      totalFindings: scoreBreakdown.totalFindings
    },
    topIssues,
    improvements,
    projectBreakdown
  };

  const markdown = generateMarkdown(reportData);
  const pdf = await generatePdf(reportData);

  return { markdown, pdf, data: reportData };
}

function generateMarkdown(data: MonthlyReportData): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[data.month - 1];

  const lines: string[] = [
    `# ${data.organizationName} - Monthly Report`,
    `## ${monthName} ${data.year}`,
    "",
    "## Overview",
    "",
    `- **Total Audits:** ${data.totalAudits}`,
    `- **Successful Audits:** ${data.successfulAudits}`,
    `- **Average Score:** ${data.averageScore}/100 (${data.scoreBreakdown.grade})`,
    `- **Scoring Policy:** ${data.scoringPolicyVersion}`,
    "",
    "## Score Breakdown",
    "",
    `| Category | Score |`,
    `|----------|-------|`,
  ];

  for (const [cat, score] of Object.entries(data.scoreBreakdown.categories)) {
    lines.push(`| ${cat} | ${score}/100 |`);
  }

  lines.push("");
  lines.push("## Severity Distribution");
  lines.push("");
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);

  for (const [sev, count] of Object.entries(data.scoreBreakdown.severityCounts)) {
    lines.push(`| ${sev} | ${count} |`);
  }

  if (data.topIssues.length > 0) {
    lines.push("");
    lines.push("## Top Issues");
    lines.push("");
    lines.push(`| Code | Title | Severity | Occurrences |`);
    lines.push(`|------|-------|----------|-------------|`);

    for (const issue of data.topIssues) {
      lines.push(`| ${issue.code} | ${issue.title} | ${issue.severity} | ${issue.count} |`);
    }
  }

  if (data.improvements.length > 0) {
    lines.push("");
    lines.push("## Improvements vs Previous Month");
    lines.push("");
    lines.push(`| Category | Before | After | Change |`);
    lines.push(`|----------|--------|-------|--------|`);

    for (const imp of data.improvements) {
      const change = imp.after - imp.before;
      lines.push(`| ${imp.category} | ${imp.before}/100 | ${imp.after}/100 | +${change} |`);
    }
  }

  if (data.projectBreakdown.length > 0) {
    lines.push("");
    lines.push("## Project Breakdown");
    lines.push("");
    lines.push(`| Project | Audits | Avg Score |`);
    lines.push(`|---------|--------|-----------|`);

    for (const proj of data.projectBreakdown) {
      lines.push(`| ${proj.projectName} | ${proj.auditCount} | ${proj.avgScore}/100 |`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push(`*Generated by ASDEV Audit Platform on ${new Date().toISOString().split("T")[0]}*`);

  return lines.join("\n");
}

async function generatePdf(data: MonthlyReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[data.month - 1];

  let y = 800;

  function draw(text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }): void {
    const size = opts?.size ?? 12;
    const selectedFont = opts?.bold ? bold : font;
    const colorTuple = opts?.color ?? [0, 0, 0];

    page.drawText(text, {
      x: 40,
      y,
      size,
      font: selectedFont,
      color: rgb(colorTuple[0], colorTuple[1], colorTuple[2])
    });
    y -= size + 8;
  }

  function drawLine(yPos: number): void {
    page.drawLine({
      start: { x: 40, y: yPos },
      end: { x: 555, y: yPos },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
  }

  function drawRect(x: number, yPos: number, width: number, height: number, color: [number, number, number]): void {
    page.drawRectangle({
      x,
      y: yPos,
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

  function newPage(): void {
    y = 800;
    page = pdf.addPage([595, 842]);
  }

  draw(data.organizationName, { size: 10, color: [0.4, 0.4, 0.4] });
  y -= 4;
  drawLine(y);
  y -= 20;

  draw(`${monthName} ${data.year} Report`, { size: 22, bold: true });
  y -= 4;
  drawLine(y);
  y -= 24;

  drawRect(40, y - 60, 160, 80, [0.96, 0.96, 0.96]);
  const gradeColor = getGradeColor(data.scoreBreakdown.grade);
  drawRect(40, y - 60, 160, 4, gradeColor);

  page.drawText(String(data.averageScore), {
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
  page.drawText(data.scoreBreakdown.grade.replace("_", " "), {
    x: 65,
    y: y - 55,
    size: 12,
    font: bold,
    color: rgb(gradeColor[0], gradeColor[1], gradeColor[2])
  });

  y -= 90;

  draw("Overview", { size: 14, bold: true });
  y -= 4;
  draw(`Total Audits: ${data.totalAudits}`, { size: 11 });
  draw(`Successful: ${data.successfulAudits}`, { size: 11 });
  draw(`Total Findings: ${data.scoreBreakdown.totalFindings}`, { size: 11 });
  y -= 12;
  drawLine(y);
  y -= 24;

  draw("Category Scores", { size: 14, bold: true });
  y -= 4;

  for (const [cat, catScore] of Object.entries(data.scoreBreakdown.categories)) {
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

  y -= 12;
  drawLine(y);
  y -= 24;

  if (data.topIssues.length > 0) {
    if (y < 150) newPage();

    draw("Top Issues", { size: 14, bold: true });
    y -= 4;

    for (const issue of data.topIssues.slice(0, 5)) {
      if (y < 80) newPage();

      const sevColor: [number, number, number] =
        issue.severity === "CRITICAL" ? [0.8, 0.1, 0.1] :
        issue.severity === "HIGH" ? [0.9, 0.4, 0.0] :
        issue.severity === "MEDIUM" ? [0.85, 0.55, 0.05] :
        [0.5, 0.5, 0.5];

      drawRect(40, y - 30, 515, 34, [1, 0.95, 0.95]);
      drawRect(40, y - 30, 4, 34, sevColor);

      page.drawText(`[${issue.severity}]`, {
        x: 52,
        y: y - 10,
        size: 10,
        font: bold,
        color: rgb(sevColor[0], sevColor[1], sevColor[2])
      });
      page.drawText(issue.title.slice(0, 50), {
        x: 110,
        y: y - 10,
        size: 10,
        font,
        color: rgb(0.1, 0.1, 0.1)
      });
      page.drawText(`${issue.count}x`, {
        x: 480,
        y: y - 10,
        size: 10,
        font: bold,
        color: rgb(0.4, 0.4, 0.4)
      });

      y -= 40;
    }

    y -= 12;
    drawLine(y);
    y -= 24;
  }

  if (data.improvements.length > 0) {
    if (y < 120) newPage();

    draw("Improvements vs Previous Month", { size: 14, bold: true });
    y -= 4;

    for (const imp of data.improvements) {
      if (y < 60) newPage();

      const change = imp.after - imp.before;
      page.drawText(`${imp.category}: ${imp.before} → ${imp.after} (+${change})`, {
        x: 50,
        y: y - 4,
        size: 10,
        font,
        color: rgb(0.13, 0.55, 0.13)
      });
      y -= 18;
    }

    y -= 12;
    drawLine(y);
    y -= 24;
  }

  if (data.projectBreakdown.length > 0) {
    if (y < 120) newPage();

    draw("Project Breakdown", { size: 14, bold: true });
    y -= 4;

    for (const proj of data.projectBreakdown) {
      if (y < 60) newPage();

      page.drawText(`${proj.projectName}: ${proj.auditCount} audits, avg ${proj.avgScore}/100`, {
        x: 50,
        y: y - 4,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3)
      });
      y -= 18;
    }
  }

  y -= 20;
  if (y < 60) newPage();
  drawLine(y);
  y -= 16;
  draw(`Generated by ASDEV Audit Platform`, { size: 8, color: [0.5, 0.5, 0.5] });

  return pdf.save();
}
