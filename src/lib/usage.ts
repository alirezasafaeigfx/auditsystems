import { prisma } from "./db";
import { DEFAULT_PLAN, getPlan } from "./plans";

export { DEFAULT_PLAN, getPlan };

export async function getCurrentPlan(): Promise<typeof DEFAULT_PLAN> {
  return DEFAULT_PLAN;
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
  const plan = await getCurrentPlan();
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
  const plan = await getCurrentPlan();
  const current = await getProjectCount(organizationId);
  return { allowed: current < plan.projectLimit, current, limit: plan.projectLimit };
}

export async function canRunAudit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = await getCurrentPlan();
  const current = await getMonthlyAuditCount(organizationId);
  return { allowed: current < plan.monthlyAuditLimit, current, limit: plan.monthlyAuditLimit };
}
