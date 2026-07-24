import type { FindingCategory, FindingSeverity } from "./types";

export type ActionItem = {
  code: string;
  title: string;
  severity: FindingSeverity;
  category: FindingCategory;
  recommendation: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  impact: "LOW" | "MEDIUM" | "HIGH";
  quadrant: "QUICK_WIN" | "MAJOR_PROJECT" | "FILL_IN" | "THANKLESS";
};

const SEVERITY_EFFORT: Record<FindingSeverity, "LOW" | "MEDIUM" | "HIGH"> = {
  CRITICAL: "HIGH",
  HIGH: "MEDIUM",
  MEDIUM: "LOW",
  LOW: "LOW",
  INFO: "LOW",
};

const SEVERITY_IMPACT: Record<FindingSeverity, "LOW" | "MEDIUM" | "HIGH"> = {
  CRITICAL: "HIGH",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "LOW",
};

function getQuadrant(effort: string, impact: string): ActionItem["quadrant"] {
  if (effort === "LOW" && impact === "HIGH") return "QUICK_WIN";
  if (effort === "HIGH" && impact === "HIGH") return "MAJOR_PROJECT";
  if (effort === "LOW" && impact === "LOW") return "FILL_IN";
  return "THANKLESS";
}

export function buildActionPlan(findings: {
  code: string;
  title: string;
  severity: FindingSeverity;
  category: FindingCategory;
  recommendation: string | null;
}[]): ActionItem[] {
  const items: ActionItem[] = findings
    .filter((f) => f.severity !== "INFO")
    .map((f) => {
      const effort = SEVERITY_EFFORT[f.severity];
      const impact = SEVERITY_IMPACT[f.severity];
      return {
        code: f.code,
        title: f.title,
        severity: f.severity,
        category: f.category,
        recommendation: f.recommendation ?? "",
        effort,
        impact,
        quadrant: getQuadrant(effort, impact),
      };
    });

  const quadrantOrder: Record<string, number> = {
    QUICK_WIN: 0,
    MAJOR_PROJECT: 1,
    FILL_IN: 2,
    THANKLESS: 3,
  };

  return items.sort((a, b) => {
    const qDiff = quadrantOrder[a.quadrant] - quadrantOrder[b.quadrant];
    if (qDiff !== 0) return qDiff;
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
  });
}

export const QUADRANT_LABELS: Record<string, { title: string; description: string; color: string }> = {
  QUICK_WIN: {
    title: "پیروزی‌های سریع",
    description: "تغییرات کم‌هزینه با تأثیر زیاد — اول اینها را انجام دهید",
    color: "#059669",
  },
  MAJOR_PROJECT: {
    title: "پروژه‌های بزرگ",
    description: "تأثیر زیاد ولی نیاز به زمان و تلاش بیشتر",
    color: "#2563eb",
  },
  FILL_IN: {
    title: "بهبودهای جزئی",
    description: "کم‌هزینه ولی تأثیر کم — در اوقات فراغت انجام دهید",
    color: "#d97706",
  },
  THANKLESS: {
    title: "کارهای دشوار کم‌تأثیر",
    description: "هزینه زیاد ولی تأثیر کم — آخرین اولویت",
    color: "var(--muted)",
  },
};
