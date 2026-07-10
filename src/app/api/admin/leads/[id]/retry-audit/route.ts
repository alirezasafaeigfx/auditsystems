import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { validateAdminSession } from "../../../../../../lib/admin-auth";
import { enqueueJob } from "../../../../../../worker/queue";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const lead = await prisma.auditLead.findUnique({ where: { id } });
  if (!lead?.runId) {
    return NextResponse.json({ error: "AUDIT_NOT_STARTED" }, { status: 409 });
  }

  await prisma.auditRun.update({
    where: { id: lead.runId },
    data: {
      status: "QUEUED",
      reportStatus: "QUEUED",
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    },
  });

  const job = await enqueueJob({ type: "AUDIT_RUN", payload: { runId: lead.runId }, timeoutMs: 90000 });
  return NextResponse.json({ runId: lead.runId, jobId: job.id, reportStatus: "QUEUED" });
}
