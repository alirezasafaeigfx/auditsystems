import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/db";
import { requireBillingAuth } from "../../../../lib/billing-auth";
import { createCheckout, resolvePaymentProvider } from "../../../../lib/payments";
import { getPlan, type PlanCode, isPaidPlan } from "../../../../lib/plans";
import { createInvoice } from "../../../../lib/subscription";
import { createRequestId, respondJson } from "../../../../lib/observability";
import { createPaymentLogger } from "../../../../lib/logger";
import { csrfProtection } from "../../../../lib/csrf";
import { checkAuthRateLimit } from "../../../../lib/authRateLimit";
import crypto from "node:crypto";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let paymentId: string | undefined;

  try {
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const { error, user, membership } = await requireBillingAuth();
    if (error) {
      return respondJson({ error, requestId }, requestId, { status: error === "UNAUTHORIZED" ? 401 : 400, headers: { "Cache-Control": "no-store" } });
    }

    const rateCheck = checkAuthRateLimit(`billing:checkout:${user.id}`);
    if (!rateCheck.allowed) {
      return respondJson({ error: "RATE_LIMITED", requestId }, requestId, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    const body = await request.json().catch(() => ({}));
    const planCode = String(body.planCode ?? "").toLowerCase().trim() as PlanCode;
    const provider = resolvePaymentProvider(body.provider ?? null);

    if (!planCode || !isPaidPlan(planCode)) {
      return respondJson({ error: "INVALID_PLAN", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const planConfig = getPlan(planCode);
    const planRecord = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!planRecord) {
      return respondJson({ error: "PLAN_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const existingActive = await prisma.subscription.findFirst({
      where: {
        organizationId: membership.organizationId,
        status: "ACTIVE",
        currentPeriodEnd: { gt: new Date() }
      }
    });

    if (existingActive) {
      const existingPlan = await prisma.plan.findUnique({ where: { id: existingActive.planId } });
      if (existingPlan?.code === planCode) {
        return respondJson({ error: "ALREADY_SUBSCRIBED", requestId }, requestId, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
    }

    const invoice = await createInvoice({
      organizationId: membership.organizationId,
      planId: planRecord.id,
      amountToman: planConfig.priceMonthlyToman,
      provider
    });

    const callbackRef = crypto.randomUUID().replace(/-/g, "");
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { callbackRef }
    });

    const checkout = await createCheckout({
      provider,
      orderId: invoice.id,
      callbackRef,
      amountToman: planConfig.priceMonthlyToman,
      email: user.email
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        callbackRef: checkout.callbackRef,
        providerRef: checkout.providerRef
      }
    });

    paymentId = invoice.id;
    const paymentLogger = createPaymentLogger(requestId, invoice.id, user.id);

    paymentLogger.info("billing_checkout_created", {
      invoiceId: invoice.id,
      planCode,
      organizationId: membership.organizationId,
      provider,
      durationMs: Date.now() - startedAt
    });

    return respondJson({
      invoiceId: invoice.id,
      status: "PENDING",
      provider,
      redirectUrl: checkout.redirectUrl,
      requestId
    }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const logger = createPaymentLogger(requestId, paymentId || "unknown");
    logger.error("billing_checkout_failed", {
      code: error instanceof Error ? error.message : String(error)
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
