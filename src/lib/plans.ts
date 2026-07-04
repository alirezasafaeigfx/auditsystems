export type PlanCode = "free" | "starter" | "pro";

export type PlanConfig = {
  code: PlanCode;
  name: string;
  projectLimit: number;
  monthlyAuditLimit: number;
  pdfExport: boolean;
  scheduledAudits: boolean;
  upgradeCta: string;
  billingNote: string;
};

export const PLANS = {
  free: {
    code: "free" as const,
    name: "Free",
    projectLimit: 1,
    monthlyAuditLimit: 3,
    pdfExport: false,
    scheduledAudits: false,
    upgradeCta: "Upgrade to Starter",
    billingNote: "Free plan — no payment required"
  },
  starter: {
    code: "starter" as const,
    name: "Starter",
    projectLimit: 3,
    monthlyAuditLimit: 20,
    pdfExport: true,
    scheduledAudits: false,
    upgradeCta: "Upgrade to Pro",
    billingNote: "Billing coming soon"
  },
  pro: {
    code: "pro" as const,
    name: "Pro",
    projectLimit: 10,
    monthlyAuditLimit: 100,
    pdfExport: true,
    scheduledAudits: true,
    upgradeCta: "Contact us",
    billingNote: "For agencies and teams"
  }
} as const;

export const DEFAULT_PLAN = PLANS.free;

export function getPlan(code: PlanCode): PlanConfig {
  return PLANS[code] ?? DEFAULT_PLAN;
}

export function getPlanComparison(): Array<{ plan: string; projects: number; audits: number; pdf: boolean; scheduled: boolean }> {
  return Object.values(PLANS).map((p) => ({
    plan: p.name,
    projects: p.projectLimit,
    audits: p.monthlyAuditLimit,
    pdf: p.pdfExport,
    scheduled: p.scheduledAudits
  }));
}
