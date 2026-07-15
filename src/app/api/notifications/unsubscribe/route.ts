import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../lib/db";
import { NextResponse } from "next/server";

function getUnsubSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) throw new Error("CSRF_SECRET required for unsubscribe tokens");
  return secret;
}

function verifyUnsubToken(token: string): string | null {
  try {
    const secret = getUnsubSecret();
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;

    const payload = decoded.slice(0, lastColon);
    const signature = decoded.slice(lastColon + 1);

    if (!payload.startsWith("unsub:")) return null;

    const expectedSig = createHash("sha256")
      .update(payload + secret)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    return payload.slice(6);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  try {
    const organizationId = verifyUnsubToken(token);
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
