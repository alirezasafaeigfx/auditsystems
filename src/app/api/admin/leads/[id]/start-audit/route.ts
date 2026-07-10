import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { validateAdminSession } from "../../../../../../lib/admin-auth";
import { enqueueJob } from "../../../../../../worker/queue";
import { createReportToken } from "../../../../../../lib/token";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const lead = await prisma.auditLead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "LEAD_NOT_FOUND" }, { status: 404 });
  }

  if (lead.runId) {
    return NextResponse.json({ error: "AUDIT_ALREADY_STARTED", runId: lead.runId }, { status: 409 });
  }

  const run = await prisma.auditRun.create({
    data: {
      url: lead.normalizedUrl ?? lead.domain,
      normalizedUrl: lead.normalizedUrl,
      depth: "DEEP",
      status: "QUEUED",
      reportStatus: "QUEUED",
      locale: "fa",
    },
  });

  const share = await prisma.reportShare.create({
    data: { runId: run.id, token: createReportToken() },
  });

  await prisma.auditLead.update({
    where: { id },
    data: { runId: run.id, status: "QUALIFIED", qualifiedAt: lead.qualifiedAt ?? new Date() },
  });

  await enqueueJob({ type: "AUDIT_RUN", payload: { runId: run.id }, timeoutMs: 90000 });

  return NextResponse.json({ runId: run.id, token: share.token, reportStatus: run.reportStatus });
}
