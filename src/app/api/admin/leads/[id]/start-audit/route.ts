import { JobStatus, JobType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { validateAdminSession } from "../../../../../../lib/admin-auth";
import { csrfProtection } from "../../../../../../lib/csrf";
import { recordFunnelEvent } from "../../../../../../lib/funnel-events";
import { logEvent } from "../../../../../../lib/observability";
import {
  AuditEnqueueError,
  buildAuditIdempotencyKey,
  enqueueAuditAtomically,
} from "../../../../../../lib/audit-enqueue";

type RouteContext = { params: Promise<{ id: string }> };

async function currentLeadRun(id: string) {
  return prisma.auditLead.findUnique({
    where: { id },
    include: { run: { include: { shares: { orderBy: { createdAt: "asc" }, take: 1 } } } },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfCheck = await csrfProtection(request);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await context.params;
  const lead = await currentLeadRun(id);
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

  const idempotencyKey = buildAuditIdempotencyKey({
    source: "ADMIN_LEAD",
    scope: id,
    rawKey: "initial-audit",
  });

  try {
    const queued = await enqueueAuditAtomically({
      url: lead.normalizedUrl ?? lead.domain,
      normalizedUrl: lead.normalizedUrl,
      depth: "DEEP",
      locale: "fa",
      source: "ADMIN_LEAD",
      idempotencyKey,
      jobTimeoutMs: 90_000,
      lead: {
        id,
        status: "QUALIFIED",
        qualifiedAt: lead.qualifiedAt ?? new Date(),
      },
    });

    if (!queued.reused) {
      try {
        await recordFunnelEvent({
          eventType: "audit_started",
          leadId: id,
          runId: queued.run.id,
          source: lead.leadSource,
          placement: lead.sourcePlacement,
          offer: lead.sourceOffer,
        });
      } catch (error) {
        logEvent("warn", "admin_lead_audit_funnel_event_failed", {
          leadId: id,
          runId: queued.run.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      runId: queued.run.id,
      token: queued.share.token,
      reportStatus: queued.run.reportStatus,
      reused: queued.reused,
    });
  } catch (error) {
    if (error instanceof AuditEnqueueError && error.code === "AUDIT_ALREADY_STARTED") {
      const current = await currentLeadRun(id);
      if (current?.runId && current.run?.shares[0]) {
        return NextResponse.json({
          runId: current.runId,
          token: current.run.shares[0].token,
          reportStatus: current.run.reportStatus,
          reused: true,
        });
      }
      return NextResponse.json({ error: "AUDIT_ALREADY_STARTED" }, { status: 409 });
    }
    if (error instanceof AuditEnqueueError) {
      return NextResponse.json({ error: error.code }, {
        status: error.code === "IDEMPOTENCY_KEY_CONFLICT" ? 409 : 400,
      });
    }
    throw error;
  }
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
