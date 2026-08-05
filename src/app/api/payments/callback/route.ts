import crypto from "node:crypto";
import { PaymentProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createDownloadToken } from "../../../../lib/downloadToken";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import {
  PaymentCallbackStateError,
  claimPaymentVerification,
  finalizePaymentVerification,
  releasePaymentVerification,
  type CallbackOrder,
} from "../../../../lib/payment-callback-state";
import { verifyCheckout } from "../../../../lib/payments";
import { consumeDistributedRateLimit } from "../../../../lib/rateLimit";

const CALLBACK_RATE_LIMIT = 30;
const CALLBACK_RATE_WINDOW_SEC = 15 * 60;
const MAX_POST_BODY_BYTES = 8 * 1024;
const PROCESSING_POLLS = 6;
const PROCESSING_POLL_MS = 500;

function parseProvider(value: string | null): PaymentProvider | null {
  const upper = (value ?? "").trim().toUpperCase();
  if (upper === "ZARINPAL") return "ZARINPAL";
  if (upper === "MOCK" && process.env.NODE_ENV !== "production") return "MOCK";
  return null;
}

function resolveLocale(locale: string | null | undefined): "fa" | "en" {
  if (!locale) return "fa";
  return locale.toLowerCase().startsWith("en") ? "en" : "fa";
}

function buildSuccessPath(locale: "fa" | "en", token: string, orderId: string, downloadToken: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/audit/r/${token}/success?orderId=${encodeURIComponent(orderId)}&dl=${encodeURIComponent(downloadToken)}`;
}

function buildFailedPath(locale: "fa" | "en", reason: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/failed?reason=${encodeURIComponent(reason)}`;
}

function shouldRedirectBrowser(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return request.method === "GET" && accept.includes("text/html");
}

function redirectWithRequestId(requestId: string, request: NextRequest, path: string, status: 302 | 303 = 302): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin), status);
  response.headers.set("x-request-id", requestId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function privacyDigest(value: string): string {
  const salt = String(process.env.IP_HASH_SALT ?? "").trim();
  if (!salt) throw new Error("IP_HASH_SALT environment variable is required but not set");
  return crypto.createHmac("sha256", salt).update(value).digest("hex");
}

function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "UNKNOWN";
  const code = error.message.trim().toUpperCase();
  if (/^[A-Z0-9_]{1,80}$/.test(code)) return code;
  if (/^PAYMENT_PROVIDER_HTTP_[0-9]{3}$/.test(code)) return code;
  return "UNEXPECTED_PAYMENT_CALLBACK_FAILURE";
}

function isValidCallbackRef(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}

function isValidProviderRef(value: string): boolean {
  return value.length <= 128 && (!value || /^[A-Za-z0-9_-]+$/.test(value));
}

async function readCallbackBody(request: NextRequest): Promise<Record<string, unknown>> {
  if (request.method !== "POST") return {};
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_POST_BODY_BYTES) {
    throw new PaymentCallbackStateError("PAYLOAD_TOO_LARGE");
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PaymentCallbackStateError("INVALID_JSON");
  }
  return body as Record<string, unknown>;
}

async function respondForTerminalOrder(
  request: NextRequest,
  requestId: string,
  order: CallbackOrder,
): Promise<NextResponse> {
  const locale = resolveLocale(order.run.locale);
  const shareToken = order.run.shares[0]?.token;

  if (order.status !== "PAID") {
    if (shouldRedirectBrowser(request)) {
      return redirectWithRequestId(requestId, request, buildFailedPath(locale, "PAYMENT_NOT_CONFIRMED"));
    }
    return respondJson(
      { ok: false, orderId: order.id, status: order.status, error: "PAYMENT_NOT_CONFIRMED", requestId },
      requestId,
      { status: 402, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!shareToken) {
    if (shouldRedirectBrowser(request)) {
      return redirectWithRequestId(requestId, request, buildFailedPath(locale, "REPORT_TOKEN_NOT_FOUND"));
    }
    return respondJson(
      { error: "REPORT_TOKEN_NOT_FOUND", requestId },
      requestId,
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  const download = createDownloadToken({ runId: order.runId, orderId: order.id, email: order.email });
  const downloadUrl = `/api/pdf/${shareToken}?dl=${encodeURIComponent(download)}`;
  const successUrl = buildSuccessPath(locale, shareToken, order.id, download);
  if (shouldRedirectBrowser(request)) {
    return redirectWithRequestId(requestId, request, successUrl);
  }
  return respondJson(
    {
      ok: true,
      orderId: order.id,
      status: order.status,
      provider: order.provider,
      downloadUrl,
      successUrl,
      requestId,
    },
    requestId,
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function claimWithBoundedPolling(input: {
  callbackRef: string;
  provider: PaymentProvider;
}) {
  let claim = await claimPaymentVerification(input);
  for (let attempt = 0; claim.kind === "PROCESSING" && attempt < PROCESSING_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_POLL_MS));
    claim = await claimPaymentVerification(input);
  }
  return claim;
}

async function handleCallback(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;
  let callbackHash: string | undefined;

  try {
    const query = request.nextUrl.searchParams;
    const body = await readCallbackBody(request);
    const rawProvider = String(query.get("provider") ?? body.provider ?? "").slice(0, 32);
    const provider = parseProvider(rawProvider);
    if (!provider) {
      statusCode = 400;
      logEvent("warn", "payment_callback_provider_rejected", { requestId });
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildFailedPath("fa", "UNSUPPORTED_PROVIDER"));
      }
      return respondJson({ error: "UNSUPPORTED_PROVIDER", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const callbackRef = String(query.get("callbackRef") ?? body.callbackRef ?? "").trim();
    const providerRef = String(query.get("Authority") ?? body.Authority ?? body.providerRef ?? "").trim();
    const callbackStatus = String(query.get("Status") ?? body.Status ?? body.status ?? "").trim().slice(0, 32);
    if (!isValidCallbackRef(callbackRef)) {
      statusCode = 400;
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildFailedPath("fa", "INVALID_CALLBACK_REF"));
      }
      return respondJson({ error: "INVALID_CALLBACK_REF", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!isValidProviderRef(providerRef)) {
      statusCode = 400;
      return respondJson({ error: "INVALID_PROVIDER_REF", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    callbackHash = privacyDigest(callbackRef);
    const limited = await consumeDistributedRateLimit({
      key: `payment-callback:${callbackHash}`,
      limit: CALLBACK_RATE_LIMIT,
      windowSec: CALLBACK_RATE_WINDOW_SEC,
    });
    if (!limited.allowed) {
      statusCode = 429;
      logEvent("warn", "payment_callback_rate_limited", {
        requestId,
        callbackHash,
        backend: limited.backend,
      });
      return respondJson({ error: "RATE_LIMITED", requestId }, requestId, {
        status: statusCode,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(Math.max(1, limited.resetSec)),
          "x-ratelimit-limit": String(limited.limit),
          "x-ratelimit-remaining": String(limited.remaining),
        },
      });
    }

    const claim = await claimWithBoundedPolling({ callbackRef, provider });
    if (claim.kind === "NOT_FOUND") {
      statusCode = 404;
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildFailedPath("fa", "ORDER_NOT_FOUND"));
      }
      return respondJson({ error: "ORDER_NOT_FOUND", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (claim.kind === "TERMINAL") {
      const response = await respondForTerminalOrder(request, requestId, claim.order);
      statusCode = response.status;
      return response;
    }
    if (claim.kind === "PROCESSING") {
      statusCode = 202;
      if (shouldRedirectBrowser(request)) {
        const retryCount = Math.min(3, Math.max(0, Number(query.get("_retry") ?? 0)));
        if (retryCount < 3) {
          const retryUrl = new URL(request.url);
          retryUrl.searchParams.set("_retry", String(retryCount + 1));
          statusCode = 303;
          return redirectWithRequestId(requestId, request, retryUrl.toString(), 303);
        }
      }
      return respondJson(
        { ok: false, orderId: claim.order.id, status: "VERIFYING", retryAfterSec: 2, requestId },
        requestId,
        { status: statusCode, headers: { "Cache-Control": "no-store", "Retry-After": "2" } },
      );
    }

    const expectedProviderRef = claim.order.providerRef;
    if (providerRef && expectedProviderRef && providerRef !== expectedProviderRef) {
      await releasePaymentVerification({
        orderId: claim.order.id,
        leaseEventId: claim.leaseEventId,
        code: "PROVIDER_REF_MISMATCH",
      });
      statusCode = 400;
      logEvent("warn", "payment_callback_reference_mismatch", {
        requestId,
        orderId: claim.order.id,
        callbackHash,
        provider,
      });
      return respondJson({ error: "PROVIDER_REF_MISMATCH", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const verificationRef = providerRef || expectedProviderRef || "";
    if (!verificationRef) {
      await releasePaymentVerification({
        orderId: claim.order.id,
        leaseEventId: claim.leaseEventId,
        code: "PROVIDER_REF_MISSING",
      });
      statusCode = 400;
      return respondJson({ error: "PROVIDER_REF_MISSING", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let verification;
    try {
      verification = await verifyCheckout({
        provider,
        providerRef: verificationRef,
        amountToman: claim.order.amountToman,
        callbackStatus,
      });
    } catch (error) {
      const code = safeErrorCode(error);
      await releasePaymentVerification({
        orderId: claim.order.id,
        leaseEventId: claim.leaseEventId,
        code,
      });
      statusCode = code === "PAYMENT_PROVIDER_TIMEOUT" ? 504
        : code === "PAYMENT_PROVIDER_NOT_CONFIGURED" ? 503
          : 502;
      logEvent("error", "payment_callback_verification_failed", {
        requestId,
        orderId: claim.order.id,
        callbackHash,
        provider,
        code,
      });
      return respondJson(
        { error: statusCode === 504 ? "PAYMENT_PROVIDER_TIMEOUT" : "PAYMENT_PROVIDER_UNAVAILABLE", requestId },
        requestId,
        { status: statusCode, headers: { "Cache-Control": "no-store" } },
      );
    }

    const finalized = await finalizePaymentVerification({
      orderId: claim.order.id,
      leaseEventId: claim.leaseEventId,
      paid: verification.paid,
      provider,
      providerRef: verification.providerRef ?? verificationRef,
      callbackStatus: callbackStatus || null,
    });
    const response = await respondForTerminalOrder(request, requestId, finalized.order);
    statusCode = response.status;

    logEvent(verification.paid ? "info" : "warn", verification.paid ? "payment_confirmed" : "payment_not_confirmed", {
      requestId,
      orderId: finalized.order.id,
      callbackHash,
      provider,
      reused: finalized.reused,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const code = error instanceof PaymentCallbackStateError ? error.code : safeErrorCode(error);
    statusCode = code === "PAYLOAD_TOO_LARGE" ? 413
      : code === "INVALID_JSON" ? 400
        : code === "PROVIDER_MISMATCH" ? 400
          : code === "STALE_PAYMENT_VERIFICATION" || code === "PAYMENT_STATE_CHANGED" ? 409
            : 500;
    logEvent("error", "payment_callback_failed", { requestId, callbackHash, code });
    return respondJson(
      { error: statusCode === 500 ? "INTERNAL_ERROR" : code, requestId },
      requestId,
      { status: statusCode, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    observeApiRequest("/api/payments/callback", statusCode, Date.now() - startedAt);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCallback(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCallback(request);
}
