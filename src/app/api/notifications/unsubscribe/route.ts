import { prisma } from "../../../../lib/db";
import { NextResponse } from "next/server";
import { verifyUnsubToken } from "@/lib/hmac-tokens";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const secret = process.env.CSRF_SECRET;

  if (!token) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  if (!secret) {
    return new NextResponse("Service misconfigured", { status: 500 });
  }

  try {
    const organizationId = verifyUnsubToken(token, secret);
    if (!organizationId) {
      return new NextResponse("Invalid token", { status: 400 });
    }

    await prisma.notificationPreference.upsert({
      where: { organizationId },
      update: { emailEnabled: false },
      create: { organizationId, emailEnabled: false }
    });

    return new NextResponse(
      "<html><body style=\"font-family:sans-serif;text-align:center;padding:4rem\"><h1>Notification Unsubscribed</h1><p>You will no longer receive email notifications from ASDEV Audit Platform.</p></body></html>",
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return new NextResponse("Invalid token", { status: 400 });
  }
}
