import { prisma } from "../../../../../lib/db";
import { observeApiRequest } from "../../../../../lib/metrics";
import { createRequestId, logEvent, respondJson } from "../../../../../lib/observability";
import { isReportShareAccessible } from "../../../../../lib/reportShare";
import { normalizeEmail } from "../../../../../lib/validators";
import { csrfProtection } from "../../../../../lib/csrf";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let statusCode = 200;

  try {
    // CSRF protection check
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      statusCode = 403;
      logEvent("warn", "unlock_csrf_validation_failed", { requestId, error: csrfCheck.error });
      return respondJson({ error: "FORBIDDEN", requestId, details: csrfCheck.error }, requestId, { 
        status: statusCode, 
        headers: { "Cache-Control": "no-store" } 
      });
    }

    const { token } = await context.params;
    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (body.consentPrivacy !== true) {
      statusCode = 400;
      return respondJson({ error: "CONSENT_REQUIRED", requestId }, requestId, {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const share = await prisma.reportShare.findUnique({ where: { token }, include: { run: { select: { status: true, url: true, normalizedUrl: true } } } });
    if (!share || !isReportShareAccessible(share)) {
      statusCode = 404;
      logEvent("warn", "unlock_not_found", { requestId, token });
      return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    if (share.run.status !== "SUCCEEDED") {
      statusCode = 409;
      logEvent("warn", "unlock_report_not_ready", { requestId, runId: share.runId });
      return respondJson({ error: "REPORT_NOT_READY", requestId }, requestId, {
        status: 409,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const existingOrder = await prisma.auditOrder.findFirst({
      where: { runId: share.runId, email, status: { in: ["PENDING", "PAID"] } },
      orderBy: { createdAt: "desc" }
    });

    if (existingOrder) {
      logEvent("info", "unlock_order_reused", { requestId, runId: share.runId, orderId: existingOrder.id });
      return respondJson({ orderId: existingOrder.id, reused: true, requestId }, requestId, {
        status: 200,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const [lead, order] = await prisma.$transaction([
      prisma.auditLead.create({
        data: {
          runId: share.runId,
          email,
          domain: share.run.normalizedUrl ?? share.run.url,
          normalizedUrl: share.run.normalizedUrl,
          businessType: "unknown",
          primaryConcern: "Report unlock checkout request",
          consentPrivacy: body.consentPrivacy,
          leadSource: "report_unlock",
          sourcePlacement: "unlock_route",
          sourceOffer: "pdf_export",
          status: 'REPORT_READY',
        },
      }),
      prisma.auditOrder.create({
        data: {
          runId: share.runId,
          email,
          provider: "MOCK",
          amountToman: 290000,
          status: "PENDING",
        }
      })
    ]);
    await prisma.auditOrder.update({
      where: { id: order.id },
      data: { leadId: lead.id }
    })

    await prisma.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "CHECKOUT_CREATED",
        payload: { source: "unlock-route", leadId: lead.id }
      }
    });

    logEvent("info", "unlock_order_created", {
      requestId,
      runId: share.runId,
      orderId: order.id,
      durationMs: Date.now() - startedAt
    });
    return respondJson({ leadId: lead.id, orderId: order.id, reused: false, requestId }, requestId, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_EMAIL") {
      statusCode = 400;
      logEvent("warn", "unlock_invalid_email", { requestId });
      return respondJson({ error: "INVALID_EMAIL", requestId }, requestId, {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      });
    }

    statusCode = 500;
    logEvent("error", "unlock_failed", { requestId, durationMs: Date.now() - startedAt });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, {
      status: 500,
      headers: { "Cache-Control": "no-store" }
    });
  } finally {
    observeApiRequest("/api/reports/[token]/unlock", statusCode, Date.now() - startedAt);
  }
}
