import { LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { validateAdminSession } from "../../../../../lib/admin-auth";
import { parseLeadStatus, parseReportStatus } from "../../../../../lib/lead-delivery";
import { csrfProtection } from "../../../../../lib/csrf";
import { recordFunnelEvent } from "../../../../../lib/funnel-events";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfCheck = await csrfProtection(request);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: "FORBIDDEN", details: csrfCheck.error }, { status: 403 });
  }

  const { id } = await context.params;
  let body: {
    status?: unknown;
    internalNote?: unknown;
    nextActionAt?: unknown;
    lostReason?: unknown;
    reportStatus?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

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
  const lostReason = typeof body.lostReason === "string" ? body.lostReason.trim().slice(0, 1000) : "";
  if (status === LeadStatus.LOST && !lostReason) {
    return NextResponse.json({ error: "LOST_REASON_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.auditLead.findUnique({ where: { id }, include: { run: true } });
  if (!existing) {
    return NextResponse.json({ error: "LEAD_NOT_FOUND" }, { status: 404 });
  }

  if (status && !isAllowedLeadTransition(existing.status, status)) {
    return NextResponse.json({ error: "INVALID_LEAD_TRANSITION" }, { status: 409 });
  }
  if (reportStatus && !existing.run) {
    return NextResponse.json({ error: "AUDIT_NOT_STARTED" }, { status: 409 });
  }
  if (reportStatus && existing.run && !isAllowedReportTransition(existing.run.reportStatus, reportStatus)) {
    return NextResponse.json({ error: "INVALID_REPORT_TRANSITION" }, { status: 409 });
  }

  const now = new Date();
  const lead = await prisma.auditLead.update({
    where: { id },
    data: {
      ...(status ? {
        status,
        qualifiedAt: status === LeadStatus.QUALIFIED ? existing.qualifiedAt ?? now : existing.qualifiedAt,
        wonAt: status === LeadStatus.WON ? now : status === LeadStatus.LOST ? null : existing.wonAt,
        lostAt: status === LeadStatus.LOST ? now : status === LeadStatus.WON ? null : existing.lostAt,
      } : {}),
      internalNote: typeof body.internalNote === "string" ? body.internalNote.slice(0, 4000) : undefined,
      nextActionAt: nextActionAt && Number.isFinite(nextActionAt.valueOf()) ? nextActionAt : undefined,
      lostReason: status === LeadStatus.LOST ? lostReason : undefined,
      run: reportStatus ? { update: { reportStatus } } : undefined,
    },
    include: { run: true },
  });

  if (status === LeadStatus.QUALIFIED) {
    await recordFunnelEvent({
      eventType: "lead_qualified",
      leadId: lead.id,
      runId: lead.runId,
      source: lead.leadSource,
      placement: lead.sourcePlacement,
      offer: lead.sourceOffer,
    });
  }
  if (status === LeadStatus.LOST) {
    await recordFunnelEvent({
      eventType: "lead_lost",
      leadId: lead.id,
      runId: lead.runId,
      source: lead.leadSource,
      placement: lead.sourcePlacement,
      offer: lead.sourceOffer,
      metadata: { lostReason },
    });
  }
  if (reportStatus === "REVIEW") {
    await recordFunnelEvent({ eventType: "report_review", leadId: lead.id, runId: lead.runId });
  }
  if (reportStatus === "DELIVERED") {
    await recordFunnelEvent({ eventType: "report_delivered", leadId: lead.id, runId: lead.runId });
  }

  return NextResponse.json({ lead });
}

function isAllowedLeadTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  const allowed: Record<LeadStatus, LeadStatus[]> = {
    [LeadStatus.NEW]: [LeadStatus.QUALIFIED, LeadStatus.CALL, LeadStatus.LOST],
    [LeadStatus.QUALIFIED]: [LeadStatus.CALL, LeadStatus.PROPOSAL, LeadStatus.WON, LeadStatus.LOST],
    [LeadStatus.CALL]: [LeadStatus.PROPOSAL, LeadStatus.WON, LeadStatus.LOST],
    [LeadStatus.PROPOSAL]: [LeadStatus.WON, LeadStatus.LOST],
    [LeadStatus.WON]: [],
    [LeadStatus.LOST]: [],
  };
  return allowed[from].includes(to);
}

function isAllowedReportTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed: Record<string, string[]> = {
    QUEUED: ["RUNNING", "FAILED"],
    RUNNING: ["REVIEW", "FAILED"],
    REVIEW: ["DELIVERED", "FAILED"],
    DELIVERED: [],
    FAILED: [],
  };
  return allowed[from]?.includes(to) ?? false;
}
