import { validateSession, getOrganizationForUser } from "./auth";

export async function requireBillingAuth() {
  const user = await validateSession();
  if (!user) {
    return { error: "UNAUTHORIZED" as const, user: null, membership: null };
  }

  const membership = await getOrganizationForUser(user.id);
  if (!membership) {
    return { error: "NO_ORGANIZATION" as const, user, membership: null };
  }

  return { error: null, user, membership };
}
