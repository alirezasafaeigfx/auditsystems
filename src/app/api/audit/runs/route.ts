import { enqueueJob } from "../../../../worker/queue";
import { prisma } from "../../../../lib/db";
import { normalizeAuditTargetUrl } from "../../../../lib/normalizeAuditTargetUrl";
import { createReportToken } from "../../../../lib/token";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { consumeDistributedRateLimit, isDistributedRateLimitRequired } from "../../../../lib/rateLimit";
import { getClientIp, hashClientIp, isDnsLookupFailure, sanitizeApiError } from "../../../../lib/security";
import { csrfProtection } from "../../../../lib/csrf";
import { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_RUNS = 5;

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;

  try {
    // CSRF protection check
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      statusCode = 403;
      logEvent("warn", "audit_run_csrf_validation_failed", { requestId, error: csrfCheck.error });
      return respondJson({ error: "FORBIDDEN", requestId, details: csrfCheck.error }, requestId, { 
        status: statusCode, 
        headers: { "Cache-Control": "no-store" } 
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      statusCode = 400;
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    if (!body || typeof body !== "object") {
      statusCode = 400;
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const payload = body as { url?: unknown; depth?: unknown };
    const inputUrl = typeof payload.url === "string" ? payload.url.trim() : "";
    if (!inputUrl) {
      statusCode = 400;
      return respondJson({ error: "INVALID_URL_EMPTY", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" }
      });
    }
    if (inputUrl.length > 2048) {
      statusCode = 400;
      return respondJson({ error: "INVALID_URL_TOO_LONG", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const depth = payload.depth === "DEEP" ? "DEEP" : "QUICK";
    const ipHash = hashClientIp(getClientIp(request));

    const distributed = await consumeDistributedRateLimit({
      key: `audit:runs:${ipHash}`,
      limit: RATE_LIMIT_MAX_RUNS,
      windowSec: Math.floor(RATE_LIMIT_WINDOW_MS / 1000)
    });
    const requireDistributed = isDistributedRateLimitRequired();
    const useDatabaseFallback = distributed.backend !== "upstash-redis" && distributed.backend !== "local-redis";

    if (requireDistributed && useDatabaseFallback) {
      logEvent("warn", "audit_run_rate_limit_backend_fallback", {
        requestId,
        backend: distributed.backend,
        fallback: "database"
      });
    }

    if (!distributed.allowed) {
      statusCode = 429;
      logEvent("warn", "audit_run_rate_limited_distributed", { requestId, ipHash, backend: distributed.backend });
      return respondJson(
        { error: "RATE_LIMITED", requestId },
        requestId,
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "x-ratelimit-limit": String(distributed.limit),
            "x-ratelimit-remaining": String(distributed.remaining),
            "x-ratelimit-reset": String(distributed.resetSec)
          }
        }
      );
    }

    if (useDatabaseFallback) {
      const recentRuns = await prisma.auditRun.count({
        where: {
          ipHash,
          createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) }
        }
      });
      if (recentRuns >= RATE_LIMIT_MAX_RUNS) {
        statusCode = 429;
        logEvent("warn", "audit_run_rate_limited", { requestId, ipHash });
        return respondJson(
          { error: "RATE_LIMITED", requestId },
          requestId,
          {
            status: 429,
            headers: {
              "Cache-Control": "no-store",
              "x-ratelimit-limit": String(RATE_LIMIT_MAX_RUNS),
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": String(Math.floor(RATE_LIMIT_WINDOW_MS / 1000))
            }
          }
        );
      }
    }

    const verifyDns = String(process.env.AUDIT_DNS_GUARD ?? "true").toLowerCase() !== "false";
    const failOpenOnDnsLookupFailure = String(process.env.AUDIT_DNS_FAIL_OPEN ?? "true").toLowerCase() === "true";

    let normalized;
    try {
      normalized = await normalizeAuditTargetUrl(inputUrl, { verifyDnsPublicIp: verifyDns });
    } catch (error) {
      if (verifyDns && failOpenOnDnsLookupFailure && isDnsLookupFailure(error)) {
        logEvent("warn", "audit_run_dns_lookup_failed_fallback", {
          requestId,
          url: normalizedUrlSafe(inputUrl),
          backend: "dns"
        });
        normalized = await normalizeAuditTargetUrl(inputUrl, { verifyDnsPublicIp: false });
      } else {
        throw error;
      }
    }

    const explicitLocale = request.headers.get("x-asdev-locale") === "en" ? "en" : "fa";

    const run = await prisma.auditRun.create({
      data: {
        url: inputUrl,
        normalizedUrl: normalized.normalizedUrl,
        depth,
        status: "QUEUED",
        ipHash,
        userAgent: request.headers.get("user-agent") ?? null,
        locale: explicitLocale
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

    logEvent("info", "audit_run_created", { requestId, runId: run.id, durationMs: Date.now() - startedAt, depth });
    return respondJson({ runId: run.id, token: share.token, status: run.status, requestId }, requestId, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    const safeError = sanitizeApiError(error);
    statusCode = safeError.status;
    logEvent("error", "audit_run_create_failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      code: safeError.code
    });
    return respondJson({ error: safeError.code, requestId }, requestId, {
      status: safeError.status,
      headers: { "Cache-Control": "no-store" }
    });
  } finally {
    observeApiRequest("/api/audit/runs", statusCode, Date.now() - startedAt);
  }
}

function normalizedUrlSafe(value: string): string {
  return value.length > 220 ? `${value.slice(0, 220)}...` : value;
}
