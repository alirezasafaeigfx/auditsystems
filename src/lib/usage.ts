import { prisma } from "./db";

export const FREE_PLAN = {
  name: "Free",
  maxProjects: 1,
  maxAuditsPerMonth: 3
} as const;

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

export async function canCreateProject(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const current = await getProjectCount(organizationId);
  return { allowed: current < FREE_PLAN.maxProjects, current, limit: FREE_PLAN.maxProjects };
}

export async function canRunAudit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const current = await getMonthlyAuditCount(organizationId);
  return { allowed: current < FREE_PLAN.maxAuditsPerMonth, current, limit: FREE_PLAN.maxAuditsPerMonth };
}
