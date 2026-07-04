import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../../lib/auth";
import { enqueueJob } from "../../../../../worker/queue";
import { createReportToken } from "../../../../../lib/token";
import { createRequestId, logEvent, respondJson } from "../../../../../lib/observability";
import { csrfProtection } from "../../../../../lib/csrf";
import { canRunAudit } from "../../../../../lib/usage";

type RouteParams = { projectId: string };

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

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) {
      return respondJson({ error: "PROJECT_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const auditCheck = await canRunAudit(orgId);
    if (!auditCheck.allowed) {
      return respondJson(
        { error: "AUDIT_LIMIT_REACHED", message: `Free plan allows ${auditCheck.limit} audits per month. Upgrade to run more.`, requestId },
        requestId,
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const run = await prisma.auditRun.create({
      data: {
        url: project.normalizedUrl || `https://${project.domain}`,
        normalizedUrl: project.normalizedUrl,
        depth: "QUICK",
        status: "QUEUED",
        projectId: project.id,
        organizationId: orgId,
        userAgent: request.headers.get("user-agent") ?? null,
        locale: "fa"
      }
    });

    const share = await prisma.reportShare.create({
      data: {
        runId: run.id,
        token: createReportToken()
      }
    });

    await enqueueJob({
      type: "AUDIT_RUN",
      payload: { runId: run.id }
    });

    logEvent("info", "project_audit_created", { requestId, runId: run.id, projectId: project.id });
    return respondJson({ runId: run.id, token: share.token, status: run.status, requestId }, requestId, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    logEvent("error", "project_audit_create_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
