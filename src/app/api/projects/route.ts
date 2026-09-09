import { NextRequest } from "next/server";
import { validateSession, getOrganizationForUser } from "../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../lib/observability";
import { csrfProtection } from "../../../lib/csrf";
import { normalizeAuditTargetUrl } from "../../../lib/normalizeAuditTargetUrl";
import {
  createProjectAtomically,
  ProjectCreateError,
} from "../../../lib/project-create";
import { getCurrentPlan } from "../../../lib/usage";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  let orgId: string | undefined;

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

    orgId = membership.organizationId;

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

    const plan = await getCurrentPlan(orgId);
    const project = await createProjectAtomically({
      organizationId: orgId,
      name,
      domain: normalized.host,
      normalizedUrl: normalized.normalizedUrl,
      projectLimit: plan.projectLimit,
    });

    logEvent("info", "project_created", { requestId, projectId: project.id, orgId });
    return respondJson({ ok: true, projectId: project.id, requestId }, requestId, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (
      error instanceof ProjectCreateError
      && error.code === "PROJECT_LIMIT_REACHED"
      && error.current !== undefined
      && error.limit !== undefined
    ) {
      return respondJson({
        error: "PROJECT_LIMIT_REACHED",
        usage: { current: error.current, limit: error.limit },
        upgradeUrl: "/app/billing",
        requestId,
      }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    if (error instanceof ProjectCreateError && error.code === "PROJECT_CREATE_RETRY_EXHAUSTED") {
      logEvent("warn", "project_create_retry_exhausted", { requestId, orgId });
      return respondJson({ error: "PROJECT_CREATE_RETRY_EXHAUSTED", requestId }, requestId, {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "1" },
      });
    }

    logEvent("error", "project_create_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
