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

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
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
      status: 'REPORT_READY'
    }
  });

  return NextResponse.json({ ok: true });
}
