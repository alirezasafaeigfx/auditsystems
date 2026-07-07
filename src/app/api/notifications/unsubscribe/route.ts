import { prisma } from "../../../../lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    if (!decoded.startsWith("unsub:")) {
      return new NextResponse("Invalid token", { status: 400 });
    }

    const organizationId = decoded.slice(6);

    await prisma.notificationPreference.upsert({
      where: { organizationId },
      update: { emailEnabled: false },
      create: { organizationId, emailEnabled: false }
    });

    return new NextResponse(
      "<html><body style='font-family:sans-serif;text-align:center;padding:4rem'><h1>Notification Unsubscribed</h1><p>You will no longer receive email notifications from ASDEV Audit Platform.</p></body></html>",
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return new NextResponse("Invalid token", { status: 400 });
  }
}
