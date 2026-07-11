import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { isReportShareAccessible } from "../../../../../lib/reportShare";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const share = await prisma.reportShare.findUnique({
    where: { token },
    include: { run: true }
  });

  if (!share || !isReportShareAccessible(share)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (share.run.status !== "SUCCEEDED") {
    return NextResponse.json({ error: "REPORT_NOT_READY" }, { status: 409 });
  }

  let body: { email?: string; name?: string; consentPrivacy?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }
  if (body.consentPrivacy !== true) {
    return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.auditLead.findFirst({
    where: { runId: share.runId, email }
  });

  if (existing) {
    return NextResponse.json({ ok: true, message: "ALREADY_CAPTURED" });
  }

  await prisma.auditLead.create({
    data: {
      runId: share.runId,
      email,
      name: body.name?.trim() || null,
      domain: share.run.normalizedUrl ?? share.run.url,
      normalizedUrl: share.run.normalizedUrl,
      businessType: "unknown",
      primaryConcern: "Captured from report page",
      consentPrivacy: body.consentPrivacy,
      leadSource: "report_capture",
      sourcePlacement: "report_page",
      sourceOffer: "follow_up",
      status: 'REPORT_READY',
    }
  });

  return NextResponse.json({ ok: true });
}
