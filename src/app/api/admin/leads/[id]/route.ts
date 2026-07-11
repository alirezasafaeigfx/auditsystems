import { LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { validateAdminSession } from "../../../../../lib/admin-auth";
import { parseLeadStatus } from "../../../../../lib/lead-delivery";
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const status = parseLeadStatus(body.status);
  const nextActionAt = typeof body.nextActionAt === "string" && body.nextActionAt
    ? new Date(body.nextActionAt)
    : null;

  if (body.status !== undefined && !status) {
    return NextResponse.json({ error: "INVALID_LEAD_STATUS" }, { status: 400 });
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

  const now = new Date();
  const lead = await prisma.auditLead.update({
    where: { id },
    data: {
      ...(status ? {
        status,
        qualifiedAt: status === LeadStatus.QUALIFIED ? existing.qualifiedAt ?? now : existing.qualifiedAt,
        convertedAt: status === LeadStatus.CONVERTED ? now : status === LeadStatus.LOST ? null : existing.convertedAt,
        lostAt: status === LeadStatus.LOST ? now : status === LeadStatus.CONVERTED ? null : existing.lostAt,
      } : {}),
      internalNote: typeof body.internalNote === "string" ? body.internalNote.slice(0, 4000) : undefined,
      nextActionAt: nextActionAt && Number.isFinite(nextActionAt.valueOf()) ? nextActionAt : undefined,
      lostReason: status === LeadStatus.LOST ? lostReason : undefined,
    },
    include: { run: true },
  });

  if (status === LeadStatus.QUALIFIED && lead.leadSource) {
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

  return NextResponse.json({ lead });
}

function isAllowedLeadTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  const allowed: Record<LeadStatus, LeadStatus[]> = {
    [LeadStatus.NEW]: [LeadStatus.QUALIFIED, LeadStatus.LOST],
    [LeadStatus.QUALIFIED]: [LeadStatus.AUDIT_STARTED, LeadStatus.LOST],
    [LeadStatus.AUDIT_STARTED]: [LeadStatus.REPORT_READY, LeadStatus.LOST],
    [LeadStatus.REPORT_READY]: [LeadStatus.DELIVERED, LeadStatus.LOST],
    [LeadStatus.DELIVERED]: [LeadStatus.CONVERTED, LeadStatus.LOST],
    [LeadStatus.CONVERTED]: [],
    [LeadStatus.LOST]: [],
  };
  return allowed[from].includes(to);
}
