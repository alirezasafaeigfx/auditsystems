export type PlanCode = "free" | "starter" | "pro" | "agency";

export type PlanConfig = {
  code: PlanCode;
  name: string;
  priceMonthlyToman: number;
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
    priceMonthlyToman: 0,
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
    priceMonthlyToman: 290000,
    projectLimit: 3,
    monthlyAuditLimit: 20,
    pdfExport: true,
    scheduledAudits: false,
    upgradeCta: "Upgrade to Pro",
    billingNote: "For small teams and freelancers"
  },
  pro: {
    code: "pro" as const,
    name: "Pro",
    priceMonthlyToman: 990000,
    projectLimit: 10,
    monthlyAuditLimit: 100,
    pdfExport: true,
    scheduledAudits: true,
    upgradeCta: "Upgrade to Agency",
    billingNote: "For growing agencies"
  },
  agency: {
    code: "agency" as const,
    name: "Agency",
    priceMonthlyToman: 2990000,
    projectLimit: 50,
    monthlyAuditLimit: 500,
    pdfExport: true,
    scheduledAudits: true,
    upgradeCta: "Contact us",
    billingNote: "For large agencies and enterprises"
  }
} as const;

export const DEFAULT_PLAN = PLANS.free;

export function getPlan(code: PlanCode): PlanConfig {
  return PLANS[code] ?? DEFAULT_PLAN;
}

export function getPlanByCode(code: string | null | undefined): PlanConfig {
  if (!code) return DEFAULT_PLAN;
  const normalized = code.toLowerCase();
  if (normalized in PLANS) return PLANS[normalized as PlanCode];
  return DEFAULT_PLAN;
}

export function getPlanComparison(): Array<{ plan: string; price: number; projects: number; audits: number; pdf: boolean; scheduled: boolean }> {
  return Object.values(PLANS).map((p) => ({
    plan: p.name,
    price: p.priceMonthlyToman,
    projects: p.projectLimit,
    audits: p.monthlyAuditLimit,
    pdf: p.pdfExport,
    scheduled: p.scheduledAudits
  }));
}

export function isPaidPlan(code: PlanCode): boolean {
  return code !== "free";
}

export function formatPriceToman(price: number): string {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
}
