import { prisma } from "./db";

export const TEAM_ROLES = ["OWNER", "ADMIN", "VIEWER"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  VIEWER: 1,
};

export function parseRole(role: string): TeamRole {
  const upper = role.toUpperCase();
  if (TEAM_ROLES.includes(upper as TeamRole)) return upper as TeamRole;
  return "VIEWER";
}

export function hasMinimumRole(userRole: string, requiredRole: TeamRole): boolean {
  const level = ROLE_HIERARCHY[parseRole(userRole)] ?? 0;
  return level >= ROLE_HIERARCHY[requiredRole];
}

export async function checkTeamPermission(
  userId: string,
  orgId: string,
  requiredRole: TeamRole
): Promise<{ allowed: boolean; membership?: { role: string; organizationId: string } }> {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });

  if (!membership) {
    return { allowed: false };
  }

  if (!hasMinimumRole(membership.role, requiredRole)) {
    return { allowed: false, membership };
  }

  return { allowed: true, membership };
}

export async function getTeamMembers(orgId: string) {
  return prisma.membership.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}
