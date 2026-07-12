import { prisma } from "../../../lib/db";
import { createDownloadToken } from "../../../lib/downloadToken";
import { observeApiRequest } from "../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../lib/observability";
import { createCheckout, resolvePaymentProvider } from "../../../lib/payments";
import { isReportShareAccessible } from "../../../lib/reportShare";
import { normalizeEmail } from "../../../lib/validators";
import { csrfProtection } from "../../../lib/csrf";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;

  try {
    // CSRF protection check
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      statusCode = 403;
      logEvent("warn", "order_csrf_validation_failed", { requestId, error: csrfCheck.error });
      return respondJson({ error: "FORBIDDEN", requestId, details: csrfCheck.error }, requestId, { 
        status: statusCode, 
        headers: { "Cache-Control": "no-store" } 
      });
    }

    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const email = normalizeEmail(body.email);
    const provider = resolvePaymentProvider(body.provider ?? null);
    if (body.consentPrivacy !== true) {
      statusCode = 400;
      return respondJson({ error: "CONSENT_REQUIRED", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    if (!token) {
      statusCode = 400;
      return respondJson({ error: "INVALID_TOKEN", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: { run: { select: { status: true, url: true, normalizedUrl: true } } }
    });

    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    if (share.run.status !== "SUCCEEDED") {
      statusCode = 409;
      return respondJson({ error: "REPORT_NOT_READY", requestId }, requestId, {
        status: statusCode,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const existingPaidOrder = await prisma.auditOrder.findFirst({
      where: { runId: share.runId, email, status: "PAID" },
      orderBy: { createdAt: "desc" }
    });

    if (existingPaidOrder) {
      const download = createDownloadToken({
        runId: share.runId,
        orderId: existingPaidOrder.id,
        email
      });
      return respondJson(
        {
          orderId: existingPaidOrder.id,
          status: existingPaidOrder.status,
          reused: true,
          downloadUrl: `/api/pdf/${token}?dl=${encodeURIComponent(download)}`,
          requestId
        },
        requestId,
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const existingPendingOrder = await prisma.auditOrder.findFirst({
      where: { runId: share.runId, email, status: "PENDING", provider },
      orderBy: { createdAt: "desc" }
    });

    const order =
      existingPendingOrder ??
      (await prisma.auditOrder.create({
        data: {
          runId: share.runId,
          email,
          provider,
          amountToman: 290000,
          status: "PENDING"
        }
      }));

    if (!existingPendingOrder) {
      const existingLead = await prisma.auditLead.findFirst({
        where: { runId: share.runId, email }
      })
      if (!existingLead) {
        const newLead = await prisma.auditLead.create({
          data: {
            runId: share.runId,
            email,
            domain: share.run.normalizedUrl ?? share.run.url,
            normalizedUrl: share.run.normalizedUrl,
            businessType: "unknown",
            primaryConcern: "Report unlock or order request",
            consentPrivacy: body.consentPrivacy,
            leadSource: "report_unlock",
            sourcePlacement: "orders_api",
            sourceOffer: "pdf_export",
            status: 'REPORT_READY',
          }
        })
        await prisma.auditOrder.update({
          where: { id: order.id },
          data: { leadId: newLead.id }
        })
      } else {
        await prisma.auditOrder.update({
          where: { id: order.id },
          data: { leadId: existingLead.id }
        })
        if (existingLead.status !== "CONVERTED" && existingLead.status !== "LOST") {
          await prisma.auditLead.update({
            where: { id: existingLead.id },
            data: { status: 'REPORT_READY' }
          })
        }
      }
    } else {
      const existingLead = await prisma.auditLead.findFirst({
        where: { runId: share.runId, email }
      })
      if (existingLead && existingLead.status !== "CONVERTED" && existingLead.status !== "LOST") {
        await prisma.auditLead.update({
          where: { id: existingLead.id },
          data: { status: 'REPORT_READY' }
        })
      }
    }

    const callbackRef = crypto.randomUUID().replace(/-/g, "");
    const checkout = await createCheckout({
      provider,
      orderId: order.id,
      callbackRef,
      amountToman: order.amountToman,
      email
    });

    await prisma.auditOrder.update({
      where: { id: order.id },
      data: {
        callbackRef: checkout.callbackRef,
        providerRef: checkout.providerRef
      }
    });

    await prisma.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "CHECKOUT_CREATED",
        payload: {
          provider,
          callbackRef: checkout.callbackRef,
          redirectUrl: checkout.redirectUrl
        }
      }
    });

    logEvent("info", "order_checkout_created", {
      requestId,
      orderId: order.id,
      runId: share.runId,
      provider,
      durationMs: Date.now() - startedAt
    });

    return respondJson(
      {
        orderId: order.id,
        status: "PENDING",
        provider,
        redirectUrl: checkout.redirectUrl,
        reused: Boolean(existingPendingOrder),
        requestId
      },
      requestId,
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_EMAIL") {
      statusCode = 400;
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
    }

    statusCode = 500;
    logEvent("error", "order_checkout_failed", { requestId, code: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: statusCode, headers: { "Cache-Control": "no-store" } });
  } finally {
    observeApiRequest("/api/orders", statusCode, Date.now() - startedAt);
  }
}
