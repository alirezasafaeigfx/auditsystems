import { prisma } from "../../../../lib/db";
import { createDownloadToken } from "../../../../lib/downloadToken";
import { observeApiRequest } from "../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { verifyCheckout } from "../../../../lib/payments";
import { PaymentProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

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

function redirectWithRequestId(requestId: string, request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin), 302);
  response.headers.set("x-request-id", requestId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function handleCallback(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;

  try {
    const query = request.nextUrl.searchParams;
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const rawProvider = String(query.get("provider") ?? (body as { provider?: string }).provider ?? "");
    const provider = parseProvider(rawProvider);

    if (!provider) {
      statusCode = 400;
      logEvent("warn", "payment_callback_provider_rejected", { requestId, provider: rawProvider || null });
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildFailedPath("fa", "UNSUPPORTED_PROVIDER"));
      }
      return respondJson({ error: "UNSUPPORTED_PROVIDER", requestId }, requestId, {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const callbackRef = String(query.get("callbackRef") ?? (body as { callbackRef?: string }).callbackRef ?? "").trim();
    const providerRef = String(query.get("Authority") ?? (body as { Authority?: string; providerRef?: string }).Authority ?? (body as { providerRef?: string }).providerRef ?? "").trim();
    const callbackStatus = String(query.get("Status") ?? (body as { Status?: string; status?: string }).Status ?? (body as { status?: string }).status ?? "").trim();

    if (!callbackRef) {
      statusCode = 400;
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildFailedPath("fa", "INVALID_CALLBACK_REF"));
      }
      return respondJson({ error: "INVALID_CALLBACK_REF", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    const order = await prisma.auditOrder.findFirst({
      where: { callbackRef },
      include: {
        run: {
          select: {
            locale: true,
            shares: { orderBy: { createdAt: "desc" }, take: 1 }
          }
        }
      }
    });
    if (!order) {
      statusCode = 404;
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildFailedPath("fa", "ORDER_NOT_FOUND"));
      }
      return respondJson({ error: "ORDER_NOT_FOUND", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    const locale = resolveLocale(order.run.locale);

    if (order.provider !== provider) {
      logEvent("warn", "payment_provider_mismatch", { requestId, expected: order.provider, received: provider, orderId: order.id });
      if (shouldRedirectBrowser(request)) {
        return redirectWithRequestId(requestId, request, buildFailedPath(locale, "PROVIDER_MISMATCH"));
      }
      return respondJson({ error: "PROVIDER_MISMATCH", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (order.status === "PAID") {
      const shareToken = order.run.shares[0]?.token;
      if (!shareToken) {
        statusCode = 409;
        if (shouldRedirectBrowser(request)) {
          statusCode = 302;
          return redirectWithRequestId(requestId, request, buildFailedPath(locale, "REPORT_TOKEN_NOT_FOUND"));
        }
        return respondJson({ error: "REPORT_TOKEN_NOT_FOUND", requestId }, requestId, {
          status: statusCode,
          headers: { "Cache-Control": "no-store" }
        });
      }

      const download = createDownloadToken({ runId: order.runId, orderId: order.id, email: order.email });
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(requestId, request, buildSuccessPath(locale, shareToken, order.id, download));
      }
      return respondJson(
        {
          ok: true,
          orderId: order.id,
          status: order.status,
          downloadUrl: `/api/pdf/${shareToken}?dl=${encodeURIComponent(download)}`,
          requestId
        },
        requestId,
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const verification = await verifyCheckout({
      provider,
      providerRef: providerRef || order.providerRef || `NOREF-${order.id}`,
      amountToman: order.amountToman,
      callbackStatus
    });

    const nextStatus = verification.paid ? "PAID" : "FAILED";

    const updated = await prisma.auditOrder.update({
      where: { id: order.id, status: "PENDING" },
      data: {
        status: nextStatus,
        paidAt: verification.paid ? new Date() : null,
        providerRef: verification.providerRef ?? order.providerRef
      },
      include: { run: { select: { locale: true, shares: { orderBy: { createdAt: "desc" }, take: 1 } } } }
    });

    if (!updated) {
      if (shouldRedirectBrowser(request)) {
        return redirectWithRequestId(requestId, request, buildFailedPath(locale, "ALREADY_PROCESSED"));
      }
      return respondJson({ ok: true, message: "Already processed", requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    await prisma.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: verification.paid ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
        payload: {
          provider,
          callbackRef,
          callbackStatus,
          providerRef,
          verification: verification.raw ?? null
        }
      }
    });

    const shareToken = updated.run.shares[0]?.token;

    if (!verification.paid || !shareToken) {
      statusCode = verification.paid ? 409 : 402;
      if (shouldRedirectBrowser(request)) {
        statusCode = 302;
        return redirectWithRequestId(
          requestId,
          request,
          buildFailedPath(resolveLocale(updated.run.locale), verification.paid ? "REPORT_TOKEN_NOT_FOUND" : "PAYMENT_NOT_CONFIRMED")
        );
      }
      return respondJson(
        {
          ok: false,
          orderId: updated.id,
          status: updated.status,
          error: verification.paid ? "REPORT_TOKEN_NOT_FOUND" : "PAYMENT_NOT_CONFIRMED",
          requestId
        },
        requestId,
        { status: statusCode, headers: { "Cache-Control": "no-store" } }
      );
    }

    const download = createDownloadToken({ runId: updated.runId, orderId: updated.id, email: updated.email });
    const downloadUrl = `/api/pdf/${shareToken}?dl=${encodeURIComponent(download)}`;
    const successUrl = buildSuccessPath(resolveLocale(updated.run.locale), shareToken, updated.id, download);

    logEvent("info", "payment_confirmed", {
      requestId,
      orderId: updated.id,
      provider,
      durationMs: Date.now() - startedAt
    });

    if (shouldRedirectBrowser(request)) {
      statusCode = 302;
      return redirectWithRequestId(requestId, request, successUrl);
    }

    return respondJson(
      {
        ok: true,
        orderId: updated.id,
        status: updated.status,
        provider,
        downloadUrl,
        successUrl,
        requestId
      },
      requestId,
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    statusCode = 500;
    logEvent("error", "payment_callback_failed", {
      requestId,
      code: error instanceof Error ? error.message : String(error)
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
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
