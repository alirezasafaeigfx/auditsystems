import { validateSession, getOrganizationForUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import { createRequestId, respondJson } from "../../../../lib/observability";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED" }, requestId, { status: 401 });
    }

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION" }, requestId, { status: 404 });
    }

    const history = await prisma.notificationHistory.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { sentAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        subject: true,
        email: true,
        sentAt: true
      }
    });

    return respondJson({ requestId, history }, requestId);
  } catch {
    return respondJson({ error: "INTERNAL_ERROR" }, requestId, { status: 500 });
  }
}
