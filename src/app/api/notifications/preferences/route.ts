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

    const pref = await prisma.notificationPreference.findUnique({
      where: { organizationId: membership.organizationId }
    });

    return respondJson(
      {
        requestId,
        preferences: {
          emailEnabled: pref?.emailEnabled ?? true
        }
      },
      requestId
    );
  } catch {
    return respondJson({ error: "INTERNAL_ERROR" }, requestId, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { emailEnabled } = body as { emailEnabled?: boolean };

    if (typeof emailEnabled !== "boolean") {
      return respondJson({ error: "INVALID_INPUT" }, requestId, { status: 400 });
    }

    const pref = await prisma.notificationPreference.upsert({
      where: { organizationId: membership.organizationId },
      update: { emailEnabled },
      create: { organizationId: membership.organizationId, emailEnabled }
    });

    return respondJson(
      {
        requestId,
        preferences: {
          emailEnabled: pref.emailEnabled
        }
      },
      requestId
    );
  } catch {
    return respondJson({ error: "INTERNAL_ERROR" }, requestId, { status: 500 });
  }
}
