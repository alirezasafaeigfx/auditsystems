import { LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { validateAdminSession } from "../../../../../lib/admin-auth";
import { parseLeadStatus, parseReportStatus } from "../../../../../lib/lead-delivery";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json() as {
    status?: unknown;
    internalNote?: unknown;
    nextActionAt?: unknown;
    lostReason?: unknown;
    reportStatus?: unknown;
  };

  const status = parseLeadStatus(body.status);
  const reportStatus = parseReportStatus(body.reportStatus);
  const nextActionAt = typeof body.nextActionAt === "string" && body.nextActionAt
    ? new Date(body.nextActionAt)
    : null;

  if (body.status !== undefined && !status) {
    return NextResponse.json({ error: "INVALID_LEAD_STATUS" }, { status: 400 });
  }
  if (body.reportStatus !== undefined && !reportStatus) {
    return NextResponse.json({ error: "INVALID_REPORT_STATUS" }, { status: 400 });
  }
  if (status === LeadStatus.LOST && typeof body.lostReason !== "string") {
    return NextResponse.json({ error: "LOST_REASON_REQUIRED" }, { status: 400 });
  }

  const lead = await prisma.auditLead.update({
    where: { id },
    data: {
      ...(status ? {
        status,
        qualifiedAt: status === LeadStatus.QUALIFIED ? new Date() : undefined,
        wonAt: status === LeadStatus.WON ? new Date() : undefined,
        lostAt: status === LeadStatus.LOST ? new Date() : undefined,
      } : {}),
      internalNote: typeof body.internalNote === "string" ? body.internalNote.slice(0, 4000) : undefined,
      nextActionAt: nextActionAt && Number.isFinite(nextActionAt.valueOf()) ? nextActionAt : undefined,
      lostReason: typeof body.lostReason === "string" ? body.lostReason.slice(0, 1000) : undefined,
      run: reportStatus ? { update: { reportStatus } } : undefined,
    },
    include: { run: true },
  });

  return NextResponse.json({ lead });
}
