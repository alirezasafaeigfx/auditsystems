import { JobStatus, JobType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { validateAdminSession } from "../../../../../../lib/admin-auth";
import { enqueueJob } from "../../../../../../worker/queue";
import { csrfProtection } from "../../../../../../lib/csrf";
import { recordFunnelEvent } from "../../../../../../lib/funnel-events";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfCheck = await csrfProtection(request);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: "FORBIDDEN", details: csrfCheck.error }, { status: 403 });
  }

  const { id } = await context.params;
  const lead = await prisma.auditLead.findUnique({ where: { id }, include: { run: true } });
  if (!lead?.runId) {
    return NextResponse.json({ error: "AUDIT_NOT_STARTED" }, { status: 409 });
  }

  if (lead.run?.reportStatus === "DELIVERED") {
    return NextResponse.json({ error: "REPORT_ALREADY_DELIVERED" }, { status: 409 });
  }

  const activeJob = await prisma.job.findFirst({
    where: {
      type: JobType.AUDIT_RUN,
      status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      payload: { path: ["runId"], equals: lead.runId },
    },
    orderBy: { createdAt: "desc" },
  });
  if (activeJob) {
    return NextResponse.json({ runId: lead.runId, jobId: activeJob.id, reportStatus: lead.run?.reportStatus ?? "QUEUED", reused: true });
  }

  const reset = await prisma.auditRun.updateMany({
    where: {
      id: lead.runId,
      status: "FAILED",
      reportStatus: "FAILED",
    },
    data: {
      status: "QUEUED",
      reportStatus: "QUEUED",
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    },
  });
  if (reset.count !== 1) {
    return NextResponse.json({ error: "AUDIT_RETRY_REQUIRES_FAILED_RUN" }, { status: 409 });
  }

  let job;
  try {
    job = await enqueueJob({ type: "AUDIT_RUN", payload: { runId: lead.runId }, timeoutMs: 90000 });
  } catch (error) {
    await prisma.auditRun.update({
      where: { id: lead.runId },
      data: {
        status: "FAILED",
        reportStatus: "FAILED",
        errorCode: "QUEUE_ENQUEUE_FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      },
    });
    await recordFunnelEvent({ eventType: "audit_queue_failed", leadId: id, runId: lead.runId });
    return NextResponse.json({ error: "QUEUE_ENQUEUE_FAILED", runId: lead.runId }, { status: 500 });
  }

  await recordFunnelEvent({ eventType: "audit_retry_queued", leadId: id, runId: lead.runId });
  return NextResponse.json({ runId: lead.runId, jobId: job.id, reportStatus: "QUEUED" });
}
