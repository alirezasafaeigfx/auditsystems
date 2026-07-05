import { prisma } from "./db";
import { DEFAULT_PLAN, getPlan, type PlanConfig } from "./plans";
import { getSubscriptionPlan, recordUsage } from "./subscription";

export { DEFAULT_PLAN, getPlan };

export async function getCurrentPlan(organizationId?: string): Promise<PlanConfig> {
  if (!organizationId) return DEFAULT_PLAN;
  return getSubscriptionPlan(organizationId);
}

export async function getMonthlyAuditCount(organizationId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return prisma.auditRun.count({
    where: {
      organizationId,
      createdAt: { gte: monthStart }
    }
  });
}

export async function getProjectCount(organizationId: string): Promise<number> {
  return prisma.project.count({ where: { organizationId } });
}

export async function getUsageStats(organizationId: string) {
  const plan = await getCurrentPlan(organizationId);
  const projectCount = await getProjectCount(organizationId);
  const auditCount = await getMonthlyAuditCount(organizationId);

  return {
    plan,
    projectCount,
    auditCount,
    projectLimit: plan.projectLimit,
    auditLimit: plan.monthlyAuditLimit,
    projectsRemaining: Math.max(0, plan.projectLimit - projectCount),
    auditsRemaining: Math.max(0, plan.monthlyAuditLimit - auditCount),
    canCreateProject: projectCount < plan.projectLimit,
    canRunAudit: auditCount < plan.monthlyAuditLimit
  };
}

export async function canCreateProject(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = await getCurrentPlan(organizationId);
  const current = await getProjectCount(organizationId);
  return { allowed: current < plan.projectLimit, current, limit: plan.projectLimit };
}

export async function canRunAudit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = await getCurrentPlan(organizationId);
  const current = await getMonthlyAuditCount(organizationId);
  return { allowed: current < plan.monthlyAuditLimit, current, limit: plan.monthlyAuditLimit };
}

export async function recordAuditUsage(organizationId: string, auditRunId: string) {
  return recordUsage({
    organizationId,
    type: "AUDIT_RUN",
    quantity: 1,
    metadata: { auditRunId }
  });
}

export async function recordPdfExportUsage(organizationId: string, auditRunId: string) {
  return recordUsage({
    organizationId,
    type: "PDF_EXPORT",
    quantity: 1,
    metadata: { auditRunId }
  });
}

export async function canScheduleAudit(organizationId: string): Promise<{ allowed: boolean; planCode: string }> {
  const plan = await getCurrentPlan(organizationId);
  return { allowed: plan.scheduledAudits, planCode: plan.code };
}
