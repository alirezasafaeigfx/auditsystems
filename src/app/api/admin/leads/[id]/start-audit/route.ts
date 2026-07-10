import { JobStatus, JobType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { validateAdminSession } from "../../../../../../lib/admin-auth";
import { enqueueJob } from "../../../../../../worker/queue";
import { createReportToken } from "../../../../../../lib/token";
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
  const lead = await prisma.auditLead.findUnique({ where: { id }, include: { run: { include: { shares: { take: 1 } } } } });
  if (!lead) {
    return NextResponse.json({ error: "LEAD_NOT_FOUND" }, { status: 404 });
  }

  if (lead.runId) {
    return NextResponse.json({
      runId: lead.runId,
      token: lead.run?.shares[0]?.token ?? null,
      reportStatus: lead.run?.reportStatus ?? "QUEUED",
      reused: true,
    });
  }

  const started = await prisma.$transaction(async (tx) => {
    const createdRun = await tx.auditRun.create({
      data: {
        url: lead.normalizedUrl ?? lead.domain,
        normalizedUrl: lead.normalizedUrl,
        depth: "DEEP",
        status: "QUEUED",
        reportStatus: "QUEUED",
        locale: "fa",
      },
    });

    const createdShare = await tx.reportShare.create({
      data: { runId: createdRun.id, token: createReportToken() },
    });

    const updated = await tx.auditLead.updateMany({
      where: { id, runId: null },
      data: { runId: createdRun.id, status: "QUALIFIED", qualifiedAt: lead.qualifiedAt ?? new Date() },
    });
    if (updated.count !== 1) {
      throw new Error("AUDIT_ALREADY_STARTED");
    }

    return { run: createdRun, share: createdShare, created: true };
  }).catch(async (error) => {
    if (error instanceof Error && error.message === "AUDIT_ALREADY_STARTED") {
      const current = await prisma.auditLead.findUnique({ where: { id }, include: { run: { include: { shares: { take: 1 } } } } });
      return {
        run: current?.run ?? null,
        share: current?.run?.shares[0] ?? null,
        created: false,
      };
    }
    throw error;
  });

  if (!started.run) {
    return NextResponse.json({ error: "AUDIT_ALREADY_STARTED" }, { status: 409 });
  }

  const { run, share } = started;
  if (!share) {
    return NextResponse.json({ error: "REPORT_SHARE_NOT_FOUND", runId: run.id }, { status: 500 });
  }
  if (!started.created) {
    return NextResponse.json({
      runId: run.id,
      token: share.token,
      reportStatus: run.reportStatus,
      reused: true,
    });
  }

  try {
    await enqueueJob({ type: "AUDIT_RUN", payload: { runId: run.id }, timeoutMs: 90000 });
  } catch (error) {
    await prisma.auditRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        reportStatus: "FAILED",
        errorCode: "QUEUE_ENQUEUE_FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      },
    });
    await recordFunnelEvent({ eventType: "audit_queue_failed", leadId: id, runId: run.id });
    return NextResponse.json({ error: "QUEUE_ENQUEUE_FAILED", runId: run.id }, { status: 500 });
  }

  await recordFunnelEvent({
    eventType: "audit_started",
    leadId: id,
    runId: run.id,
    source: lead.leadSource,
    placement: lead.sourcePlacement,
    offer: lead.sourceOffer,
  });

  return NextResponse.json({ runId: run.id, token: share.token, reportStatus: run.reportStatus });
}

export async function activeJobForRun(runId: string) {
  return prisma.job.findFirst({
    where: {
      type: JobType.AUDIT_RUN,
      status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      payload: { path: ["runId"], equals: runId },
    },
    orderBy: { createdAt: "desc" },
  });
}
