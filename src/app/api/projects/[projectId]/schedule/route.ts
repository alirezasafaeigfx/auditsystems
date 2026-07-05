import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../../../lib/observability";
import { csrfProtection } from "../../../../../lib/csrf";
import { canScheduleAudit } from "../../../../../lib/usage";

type RouteParams = { projectId: string };

function getNextRunDate(frequency: string): Date {
  const now = new Date();
  if (frequency === "WEEKLY") {
    now.setDate(now.getDate() + 7);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const orgId = membership.organizationId;
    const { projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) {
      return respondJson({ error: "PROJECT_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const schedules = await prisma.scheduledAudit.findMany({
      where: { organizationId: orgId, projectId },
      orderBy: { createdAt: "desc" }
    });

    const scheduleCheck = await canScheduleAudit(orgId);

    return respondJson({
      schedules: schedules.map(s => ({
        id: s.id,
        frequency: s.frequency,
        enabled: s.enabled,
        nextRunAt: s.nextRunAt,
        lastRunAt: s.lastRunAt
      })),
      canSchedule: scheduleCheck.allowed,
      planCode: scheduleCheck.planCode,
      requestId
    }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "schedule_list_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const membership = await getOrganizationForUser(user.id);
    if (!membership) {
      return respondJson({ error: "NO_ORGANIZATION", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const orgId = membership.organizationId;
    const { projectId } = await params;

    const scheduleCheck = await canScheduleAudit(orgId);
    if (!scheduleCheck.allowed) {
      return respondJson(
        { error: "SCHEDULE_NOT_ALLOWED", message: "Scheduled audits require Pro plan or higher.", requestId },
        requestId,
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) {
      return respondJson({ error: "PROJECT_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const payload = body as { frequency?: string };
    const frequency = String(payload.frequency ?? "").toUpperCase().trim();
    if (frequency !== "WEEKLY" && frequency !== "MONTHLY") {
      return respondJson({ error: "INVALID_FREQUENCY", message: "Frequency must be WEEKLY or MONTHLY.", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const existing = await prisma.scheduledAudit.findFirst({
      where: { organizationId: orgId, projectId, frequency, enabled: true }
    });
    if (existing) {
      return respondJson({ error: "SCHEDULE_EXISTS", requestId }, requestId, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const schedule = await prisma.scheduledAudit.create({
      data: {
        organizationId: orgId,
        projectId,
        frequency,
        enabled: true,
        nextRunAt: getNextRunDate(frequency)
      }
    });

    logEvent("info", "schedule_created", { requestId, scheduleId: schedule.id, projectId, frequency });

    return respondJson({
      schedule: {
        id: schedule.id,
        frequency: schedule.frequency,
        enabled: schedule.enabled,
        nextRunAt: schedule.nextRunAt
      },
      requestId
    }, requestId, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "schedule_create_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
