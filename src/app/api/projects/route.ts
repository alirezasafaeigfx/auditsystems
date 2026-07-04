import { NextRequest } from "next/server";
import { prisma } from "../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../lib/observability";
import { csrfProtection } from "../../../lib/csrf";
import { normalizeAuditTargetUrl } from "../../../lib/normalizeAuditTargetUrl";

const FREE_PROJECT_LIMIT = 1;

export async function POST(request: NextRequest) {
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

    const projectCount = await prisma.project.count({ where: { organizationId: orgId } });
    if (projectCount >= FREE_PROJECT_LIMIT) {
      return respondJson({ error: "PROJECT_LIMIT_REACHED", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (!body || typeof body !== "object") {
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const payload = body as { name?: unknown; url?: unknown };
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name || name.length < 1 || name.length > 100) {
      return respondJson({ error: "INVALID_NAME", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    if (!url) {
      return respondJson({ error: "INVALID_URL", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    let normalized;
    try {
      normalized = await normalizeAuditTargetUrl(url, { verifyDnsPublicIp: false });
    } catch {
      return respondJson({ error: "INVALID_URL_FORMAT", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name,
        domain: normalized.host,
        normalizedUrl: normalized.normalizedUrl
      }
    });

    logEvent("info", "project_created", { requestId, projectId: project.id, orgId });
    return respondJson({ ok: true, projectId: project.id, requestId }, requestId, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "project_create_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
