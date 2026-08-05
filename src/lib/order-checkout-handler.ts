import crypto from "node:crypto";
import { PaymentProvider } from "@prisma/client";
import { prisma } from "./db";
import { createDownloadToken } from "./downloadToken";
import { observeApiRequest } from "./metrics";
import { createRequestId, logEvent, respondJson } from "./observability";
import {
  OrderCheckoutError,
  completeOrderCheckout,
  failOrderCheckout,
  markOrderCheckoutProviderRequestStarted,
  prepareOrderCheckout,
} from "./order-checkout";
import { createCheckout, resolvePaymentProvider } from "./payments";
import { consumeDistributedRateLimit } from "./rateLimit";
import { isReportShareAccessible } from "./reportShare";
import { csrfProtection } from "./csrf";
import { normalizeEmail } from "./validators";

const MAX_ORDER_BODY_BYTES = 8 * 1024;
const ORDER_RATE_LIMIT = 8;
const ORDER_RATE_WINDOW_SEC = 15 * 60;

function privacyDigest(value: string): string {
  const salt = String(process.env.IP_HASH_SALT ?? "").trim();
  if (!salt) throw new Error("IP_HASH_SALT environment variable is required but not set");
  return crypto.createHmac("sha256", salt).update(value).digest("hex");
}

function safeFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return "UNKNOWN";
  const code = error.message.trim().toUpperCase();
  if (/^[A-Z0-9_]{1,80}$/.test(code)) return code;
  if (/^PAYMENT_PROVIDER_HTTP_[0-9]{3}$/.test(code)) return code;
  return "UNEXPECTED_CHECKOUT_FAILURE";
}

function paymentFailureResponse(error: unknown, requestId: string) {
  const code = safeFailureCode(error);
  if (code === "PAYMENT_PROVIDER_NOT_CONFIGURED") {
    return respondJson(
      { error: "PAYMENT_PROVIDER_UNAVAILABLE", requestId },
      requestId,
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (code === "PAYMENT_PROVIDER_TIMEOUT") {
    return respondJson(
      { error: "PAYMENT_PROVIDER_TIMEOUT", requestId },
      requestId,
      { status: 504, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (code.startsWith("PAYMENT_PROVIDER_HTTP_") || code === "PAYMENT_PROVIDER_REQUEST_FAILED") {
    return respondJson(
      { error: "PAYMENT_PROVIDER_UNAVAILABLE", requestId },
      requestId,
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  return respondJson(
    { error: "INTERNAL_ERROR", requestId },
    requestId,
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

function parseProvider(value: unknown): PaymentProvider {
  return resolvePaymentProvider(typeof value === "string" ? value : null);
}

export async function handleOrderCheckoutRequest(
  request: Request,
  options: { metricPath: string; tokenOverride?: string },
) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;
  let tokenHash: string | undefined;
  let claimedOrder: { id: string; callbackRef: string } | null = null;
  let providerRequestStarted = false;

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_ORDER_BODY_BYTES) {
      statusCode = 413;
      return respondJson({ error: "PAYLOAD_TOO_LARGE", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      statusCode = 403;
      logEvent("warn", "order_csrf_validation_failed", { requestId });
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      statusCode = 400;
      return respondJson({ error: "INVALID_JSON", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      statusCode = 400;
      return respondJson({ error: "INVALID_PAYLOAD", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const payload = body as { token?: unknown; email?: unknown; provider?: unknown; consentPrivacy?: unknown };
    const token = String(options.tokenOverride ?? payload.token ?? "").trim();
    if (!token || token.length > 128) {
      statusCode = 400;
      return respondJson({ error: "INVALID_TOKEN", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }
    tokenHash = privacyDigest(token);

    let email: string;
    try {
      email = normalizeEmail(payload.email);
    } catch {
      statusCode = 400;
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (payload.consentPrivacy !== true) {
      statusCode = 400;
      return respondJson({ error: "CONSENT_REQUIRED", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let provider: PaymentProvider;
    try {
      provider = parseProvider(payload.provider);
    } catch (error) {
      statusCode = 503;
      logEvent("warn", "order_provider_rejected", {
        requestId,
        tokenHash,
        code: safeFailureCode(error),
      });
      return respondJson({ error: "PAYMENT_PROVIDER_UNAVAILABLE", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const limited = await consumeDistributedRateLimit({
      key: `order-checkout:${privacyDigest(`${token}\u0000${email}\u0000${provider}`)}`,
      limit: ORDER_RATE_LIMIT,
      windowSec: ORDER_RATE_WINDOW_SEC,
    });
    if (!limited.allowed) {
      statusCode = 429;
      logEvent("warn", "order_checkout_rate_limited", {
        requestId,
        tokenHash,
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

    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: {
        run: {
          select: {
            status: true,
            url: true,
            normalizedUrl: true,
          },
        },
      },
    });
    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      logEvent("warn", "order_report_not_found", { requestId, tokenHash });
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (share.run.status !== "SUCCEEDED") {
      statusCode = 409;
      return respondJson({ error: "REPORT_NOT_READY", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const prepared = await prepareOrderCheckout({
      runId: share.runId,
      email,
      provider,
      domain: share.run.normalizedUrl ?? share.run.url,
      normalizedUrl: share.run.normalizedUrl,
    });

    if (prepared.kind === "PAID") {
      const download = createDownloadToken({
        runId: share.runId,
        orderId: prepared.order.id,
        email,
      });
      return respondJson({
        orderId: prepared.order.id,
        status: prepared.order.status,
        reused: true,
        downloadUrl: `/api/pdf/${token}?dl=${encodeURIComponent(download)}`,
        requestId,
      }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    if (prepared.kind === "READY") {
      return respondJson({
        orderId: prepared.order.id,
        status: prepared.order.status,
        provider,
        redirectUrl: prepared.redirectUrl,
        reused: true,
        requestId,
      }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    if (prepared.kind === "INITIALIZING") {
      statusCode = 202;
      return respondJson({
        orderId: prepared.order.id,
        status: "INITIALIZING",
        retryAfterSec: prepared.retryAfterSec,
        requestId,
      }, requestId, {
        status: statusCode,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(prepared.retryAfterSec),
        },
      });
    }

    claimedOrder = { id: prepared.order.id, callbackRef: prepared.callbackRef };
    await markOrderCheckoutProviderRequestStarted({
      orderId: prepared.order.id,
      callbackRef: prepared.callbackRef,
      provider,
    });
    providerRequestStarted = true;

    let checkout;
    try {
      checkout = await createCheckout({
        provider,
        orderId: prepared.order.id,
        callbackRef: prepared.callbackRef,
        amountToman: prepared.order.amountToman,
        email,
      });
    } catch (error) {
      const code = safeFailureCode(error);
      await failOrderCheckout({
        orderId: prepared.order.id,
        callbackRef: prepared.callbackRef,
        code,
      });
      claimedOrder = null;
      providerRequestStarted = false;
      statusCode = code === "PAYMENT_PROVIDER_TIMEOUT" ? 504
        : code === "PAYMENT_PROVIDER_NOT_CONFIGURED" ? 503
          : code.startsWith("PAYMENT_PROVIDER_") ? 502
            : 500;
      logEvent("error", "order_checkout_provider_failed", {
        requestId,
        orderId: prepared.order.id,
        tokenHash,
        provider,
        code,
      });
      return paymentFailureResponse(error, requestId);
    }

    const completed = await completeOrderCheckout({
      orderId: prepared.order.id,
      callbackRef: checkout.callbackRef,
      providerRef: checkout.providerRef,
      redirectUrl: checkout.redirectUrl,
      provider,
    });
    claimedOrder = null;
    providerRequestStarted = false;

    logEvent("info", "order_checkout_created", {
      requestId,
      orderId: completed.order.id,
      runId: share.runId,
      tokenHash,
      provider,
      reused: completed.reused,
      durationMs: Date.now() - startedAt,
    });

    return respondJson({
      orderId: completed.order.id,
      status: completed.order.status,
      provider,
      redirectUrl: completed.redirectUrl,
      reused: completed.reused,
      requestId,
    }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (claimedOrder && !providerRequestStarted) {
      await failOrderCheckout({
        orderId: claimedOrder.id,
        callbackRef: claimedOrder.callbackRef,
        code: safeFailureCode(error),
      }).catch(() => undefined);
    }

    const code = error instanceof OrderCheckoutError ? error.code : safeFailureCode(error);
    const reconciliationRequired = providerRequestStarted || code === "ORDER_CHECKOUT_RECONCILIATION_REQUIRED";
    statusCode = reconciliationRequired || code === "ORDER_CHECKOUT_STATE_CHANGED" ? 409 : 500;
    logEvent("error", "order_checkout_failed", {
      requestId,
      tokenHash,
      orderId: claimedOrder?.id,
      code: reconciliationRequired ? "ORDER_CHECKOUT_RECONCILIATION_REQUIRED" : code,
    });
    return respondJson(
      {
        error: reconciliationRequired
          ? "CHECKOUT_RECONCILIATION_REQUIRED"
          : statusCode === 409
            ? "CHECKOUT_RETRY_REQUIRED"
            : "INTERNAL_ERROR",
        requestId,
      },
      requestId,
      { status: statusCode, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    observeApiRequest(options.metricPath, statusCode, Date.now() - startedAt);
  }
}
