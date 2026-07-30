import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../../../lib/observability";
import { csrfProtection } from "../../../../../lib/csrf";
import { getCurrentPlan } from "../../../../../lib/usage";
import {
  AuditEnqueueError,
  buildAuditIdempotencyKey,
  enqueueAuditAtomically,
} from "../../../../../lib/audit-enqueue";

type RouteParams = { projectId: string };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const requestId = createRequestId();
  let auditLimit: number | undefined;

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

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) {
      return respondJson({ error: "PROJECT_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const plan = await getCurrentPlan(orgId);
    auditLimit = plan.monthlyAuditLimit;

    const rawIdempotencyKey = request.headers.get("idempotency-key")?.trim();
    const idempotencyKey = rawIdempotencyKey
      ? buildAuditIdempotencyKey({
          source: "PROJECT_API",
          scope: `${orgId}:${project.id}`,
          rawKey: rawIdempotencyKey,
        })
      : undefined;

    const queued = await enqueueAuditAtomically({
      url: project.normalizedUrl || `https://${project.domain}`,
      normalizedUrl: project.normalizedUrl,
      depth: "QUICK",
      projectId: project.id,
      organizationId: orgId,
      userAgent: request.headers.get("user-agent"),
      locale: "fa",
      source: "PROJECT_API",
      idempotencyKey,
      auditLimit,
      usage: {
        type: "AUDIT_RUN",
        metadata: { projectId: project.id },
      },
    });

    logEvent("info", "project_audit_created", {
      requestId,
      runId: queued.run.id,
      projectId: project.id,
      reused: queued.reused,
    });
    return respondJson({
      runId: queued.run.id,
      token: queued.share.token,
      status: queued.run.status,
      reused: queued.reused,
      requestId,
    }, requestId, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    if (error instanceof AuditEnqueueError) {
      const status = error.code === "AUDIT_LIMIT_REACHED"
        ? 403
        : error.code === "PROJECT_NOT_FOUND"
          ? 404
          : error.code === "IDEMPOTENCY_KEY_CONFLICT"
            ? 409
            : 400;
      const body = error.code === "AUDIT_LIMIT_REACHED"
        ? {
            error: error.code,
            message: `Current plan allows ${auditLimit ?? 0} audits per month. Upgrade to run more.`,
            requestId,
          }
        : { error: error.code, requestId };
      return respondJson(body, requestId, {
        status,
        headers: { "Cache-Control": "no-store" },
      });
    }

    logEvent("error", "project_audit_create_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
