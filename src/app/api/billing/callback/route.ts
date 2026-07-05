import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { verifyCheckout } from "../../../../lib/payments";
import { activateInvoice, createSubscription } from "../../../../lib/subscription";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { PaymentProvider } from "@prisma/client";

function asProvider(value: string | null): PaymentProvider {
  const upper = (value ?? "").toUpperCase();
  if (upper === "ZARINPAL") return "ZARINPAL";
  if (upper === "IDPAY") return "IDPAY";
  if (upper === "PAYPING") return "PAYPING";
  return "MOCK";
}

export async function GET(request: NextRequest) {
  return handleBillingCallback(request);
}

export async function POST(request: NextRequest) {
  return handleBillingCallback(request);
}

async function handleBillingCallback(request: NextRequest): Promise<NextResponse> {
  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    const query = request.nextUrl.searchParams;
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};

    const provider = asProvider(String(query.get("provider") ?? (body as { provider?: string }).provider ?? "MOCK"));
    const callbackRef = String(query.get("callbackRef") ?? (body as { callbackRef?: string }).callbackRef ?? "").trim();
    const providerRef = String(query.get("Authority") ?? (body as { Authority?: string; providerRef?: string }).Authority ?? (body as { providerRef?: string }).providerRef ?? "").trim();
    const callbackStatus = String(query.get("Status") ?? (body as { Status?: string; status?: string }).Status ?? (body as { status?: string }).status ?? "").trim();

    if (!callbackRef) {
      return respondJson({ error: "INVALID_CALLBACK_REF", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { callbackRef },
      include: { organization: true, plan: true }
    });

    if (!invoice) {
      return respondJson({ error: "INVOICE_NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (invoice.status === "PAID") {
      return respondJson({
        ok: true,
        invoiceId: invoice.id,
        status: invoice.status,
        message: "Already processed",
        requestId
      }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    if (invoice.status !== "PENDING") {
      return respondJson({
        ok: false,
        invoiceId: invoice.id,
        status: invoice.status,
        error: "INVOICE_NOT_PENDING",
        requestId
      }, requestId, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const verification = await verifyCheckout({
      provider,
      providerRef: providerRef || invoice.providerRef || `NOREF-${invoice.id}`,
      amountToman: invoice.amountToman,
      callbackStatus
    });

    if (verification.paid) {
      await activateInvoice(invoice.id);

      const existingSub = await prisma.subscription.findFirst({
        where: {
          organizationId: invoice.organizationId,
          status: "ACTIVE",
          planId: invoice.planId,
          currentPeriodEnd: { gt: new Date() }
        }
      });

      if (!existingSub) {
        await createSubscription({
          organizationId: invoice.organizationId,
          planCode: invoice.plan.code as "free" | "starter" | "pro" | "agency",
          invoiceId: invoice.id
        });
      }

      logEvent("info", "billing_payment_confirmed", {
        requestId,
        invoiceId: invoice.id,
        provider,
        planCode: invoice.plan.code,
        organizationId: invoice.organizationId,
        durationMs: Date.now() - startedAt
      });

      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(new URL("/app/billing?status=success", baseUrl), 302);
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "FAILED" }
    });

    logEvent("info", "billing_payment_failed", {
      requestId,
      invoiceId: invoice.id,
      provider,
      durationMs: Date.now() - startedAt
    });

    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(new URL("/app/billing?status=failed", baseUrl), 302);
  } catch (error) {
    logEvent("error", "billing_callback_failed", {
      requestId,
      code: error instanceof Error ? error.message : String(error)
    });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
