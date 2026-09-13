import { NextRequest } from "next/server";
import { isValidRumWebVitalValue, observeApiRequest, observeRumError, observeRumWebVital } from "../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { consumeDistributedRateLimit } from "../../../../lib/rateLimit";
import { getClientIp, hashClientIp } from "../../../../lib/security";
import { sanitizeMeasurementPath } from "../../../../lib/measurement-safety";

const RATE_LIMIT_PER_MINUTE = 120;
const RATE_LIMIT_WINDOW_SEC = 60;

const WEB_VITALS = new Set(["TTFB", "FCP", "LCP", "CLS", "FID", "INP"]);
const ERROR_TYPES = new Set(["error", "unhandledrejection"]);

type RumPayload = {
  type?: unknown;
  metric?: unknown;
  value?: unknown;
  path?: unknown;
  locale?: unknown;
  subtype?: unknown;
  message?: unknown;
};

function isLocale(value: unknown): value is "fa" | "en" {
  return value === "fa" || value === "en";
}

function sanitizeMessage(value: unknown): string {
  if (typeof value !== "string") {
    return "unknown";
  }
  const trimmed = value.trim();
  return (trimmed || "unknown").slice(0, 260);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 202;

  try {
    const ipHash = hashClientIp(getClientIp(request));
    const rl = await consumeDistributedRateLimit({
      key: `audit:rum:${ipHash}`,
      limit: RATE_LIMIT_PER_MINUTE,
      windowSec: RATE_LIMIT_WINDOW_SEC,
    });
    if (!rl.allowed) {
      statusCode = 429;
      return respondJson(
        { ok: false, error: "RATE_LIMITED", requestId },
        requestId,
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "x-ratelimit-limit": String(rl.limit),
            "x-ratelimit-remaining": String(rl.remaining),
            "x-ratelimit-reset": String(rl.resetSec),
          },
        },
      );
    }

    let body: RumPayload;
    try {
      body = (await request.json()) as RumPayload;
    } catch {
      statusCode = 400;
      return respondJson({ ok: false, error: "INVALID_JSON", requestId }, requestId, {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const type = typeof body.type === "string" ? body.type : "";
    const locale = isLocale(body.locale) ? body.locale : "fa";
    const path = sanitizeMeasurementPath(body.path);

    if (type === "web_vital") {
      const metric = typeof body.metric === "string" ? body.metric : "";
      const value = typeof body.value === "number" ? body.value : Number.NaN;
      if (!WEB_VITALS.has(metric) || !isValidRumWebVitalValue(metric, value)) {
        statusCode = 400;
        return respondJson({ ok: false, error: "INVALID_WEB_VITAL_PAYLOAD", requestId }, requestId, {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        });
      }

      observeRumWebVital(metric, value);
      return respondJson({ ok: true, type, metric, path, locale, requestId }, requestId, {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (type === "js_error") {
      const subtype = typeof body.subtype === "string" && ERROR_TYPES.has(body.subtype)
        ? body.subtype
        : "error";
      observeRumError(subtype);
      return respondJson({ ok: true, type, subtype, path, locale, requestId }, requestId, {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      });
    }

    statusCode = 400;
    return respondJson({ ok: false, error: "INVALID_TYPE", requestId }, requestId, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = sanitizeMessage(error instanceof Error ? error.message : "internal_error");
    logEvent("error", "rum_ingest_failed", {
      requestId,
      code: message,
    });
    statusCode = 500;
    return respondJson({ ok: false, error: "INTERNAL_ERROR", requestId }, requestId, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    observeApiRequest("/api/analytics/rum", statusCode, Date.now() - startedAt);
  }
}
