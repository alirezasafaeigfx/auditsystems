import { NextResponse } from "next/server";
import { validateSession, getOrganizationForUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import { csrfProtection } from "../../../../lib/csrf";
import { logEvent } from "../../../../lib/observability";

export async function GET() {
  const user = await validateSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const membership = await getOrganizationForUser(user.id);
  if (!membership) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      name: true,
      brandName: true,
      brandLogoBase64: true,
      primaryColor: true,
      secondaryColor: true
    }
  });

  return NextResponse.json(org, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const csrfCheck = await csrfProtection(request);
  if (!csrfCheck.valid) {
    logEvent("warn", "brand_csrf_failed", { error: csrfCheck.error });
    return NextResponse.json({ error: "FORBIDDEN", details: csrfCheck.error }, { status: 403 });
  }

  const user = await validateSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const membership = await getOrganizationForUser(user.id);
  if (!membership) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 404 });
  }

  const body = await request.json();
  const { brandName, brandLogoBase64, primaryColor, secondaryColor } = body;

  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: {
      brandName: brandName || null,
      brandLogoBase64: brandLogoBase64 || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null
    }
  });

  return NextResponse.json({ success: true });
}
