import crypto from "node:crypto";
import { prisma } from "../../../../lib/db";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { consumeDistributedRateLimit } from "../../../../lib/rateLimit";
import {
  REPORT_SHARE_PASSWORD_MAX_LENGTH,
  hasPassword,
  isReportShareAccessible,
  verifyPassword,
} from "../../../../lib/reportShare";

const PASSWORD_ATTEMPT_LIMIT = 10;
const PASSWORD_ATTEMPT_WINDOW_SEC = 15 * 60;

function tokenDigest(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function fetchShareWithFindings(token: string) {
  return prisma.reportShare.findUnique({
    where: { token },
    include: {
      run: {
        include: {
          findings: {
            orderBy: [{ createdAt: "asc" }],
          },
        },
      },
    },
  });
}

function buildReportResponse(share: Awaited<ReturnType<typeof fetchShareWithFindings>>, requestId: string) {
  if (!share) return null;
  return {
    run: {
      id: share.run.id,
      url: share.run.url,
      normalizedUrl: share.run.normalizedUrl,
      status: share.run.status,
      summary: share.run.summary,
    },
    findings: share.run.findings,
    status: share.run.status,
    share: {
      viewCount: share.viewCount + 1,
      lastViewedAt: new Date().toISOString(),
      expiresAt: share.expiresAt?.toISOString(),
    },
    requestId,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;
  try {
    const { token } = await context.params;
    const digest = tokenDigest(token);
    const share = await fetchShareWithFindings(token);

    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      logEvent("warn", "report_fetch_not_found", { requestId, tokenHash: digest });
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (hasPassword(share)) {
      statusCode = 401;
      return respondJson(
        { error: "PASSWORD_REQUIRED", requestId },
        requestId,
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    await prisma.reportShare.update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    logEvent("info", "report_fetched", { requestId, runId: share.run.id, durationMs: Date.now() - startedAt });
    return respondJson(
      buildReportResponse(share, requestId),
      requestId,
      { headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    observeApiRequest("/api/reports/[token]", statusCode, Date.now() - startedAt);
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;
  try {
    const { token } = await context.params;
    const digest = tokenDigest(token);
    const share = await fetchShareWithFindings(token);

    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      logEvent("warn", "report_fetch_not_found", { requestId, tokenHash: digest });
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (hasPassword(share)) {
      const rateLimit = await consumeDistributedRateLimit({
        key: `report-password:${digest}`,
        limit: PASSWORD_ATTEMPT_LIMIT,
        windowSec: PASSWORD_ATTEMPT_WINDOW_SEC,
      });
      if (!rateLimit.allowed) {
        statusCode = 429;
        logEvent("warn", "report_password_rate_limited", {
          requestId,
          tokenHash: digest,
          backend: rateLimit.backend,
        });
        return respondJson(
          { error: "RATE_LIMITED", requestId },
          requestId,
          {
            status: 429,
            headers: {
              "Cache-Control": "no-store",
              "Retry-After": String(Math.max(1, rateLimit.resetSec)),
              "x-ratelimit-limit": String(rateLimit.limit),
              "x-ratelimit-remaining": String(rateLimit.remaining),
              "x-ratelimit-reset": String(rateLimit.resetSec),
            },
          },
        );
      }

      let providedPassword: string | null = null;
      try {
        const body = await request.json();
        if (
          body
          && typeof body === "object"
          && "password" in body
          && typeof body.password === "string"
          && body.password.length <= REPORT_SHARE_PASSWORD_MAX_LENGTH
        ) {
          providedPassword = body.password;
        }
      } catch {
        // Invalid or missing JSON is handled as a generic password failure.
      }

      if (!providedPassword || !await verifyPassword(providedPassword, share.passwordHash!)) {
        statusCode = 401;
        logEvent("warn", "report_password_rejected", { requestId, tokenHash: digest });
        return respondJson(
          { error: "PASSWORD_REQUIRED", requestId },
          requestId,
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    await prisma.reportShare.update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    logEvent("info", "report_fetched", { requestId, runId: share.run.id, durationMs: Date.now() - startedAt });
    return respondJson(
      buildReportResponse(share, requestId),
      requestId,
      { headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    observeApiRequest("/api/reports/[token]", statusCode, Date.now() - startedAt);
  }
}
