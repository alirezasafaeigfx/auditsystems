import { prisma } from "../../../../lib/db";
import { requireBillingAuth } from "../../../../lib/billing-auth";
import { getUsageStats } from "../../../../lib/usage";
import { getInvoices } from "../../../../lib/subscription";
import { createRequestId, respondJson } from "../../../../lib/observability";

export async function GET() {
  const requestId = createRequestId();

  try {
    const { error, membership } = await requireBillingAuth();
    if (error) {
      return respondJson({ error, requestId }, requestId, { status: error === "UNAUTHORIZED" ? 401 : 400, headers: { "Cache-Control": "no-store" } });
    }

    const orgId = membership.organizationId;

    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });

    const usage = await getUsageStats(orgId);
    const invoices = await getInvoices(orgId, 10);

    const plan = subscription?.plan ?? await prisma.plan.findUnique({ where: { code: "free" } });

    return respondJson({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan: {
          code: subscription.plan.code,
          name: subscription.plan.name,
          priceMonthlyToman: subscription.plan.priceMonthlyToman
        },
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      } : null,
      plan: plan ? {
        code: plan.code,
        name: plan.name,
        priceMonthlyToman: plan.priceMonthlyToman,
        projectLimit: plan.projectLimit,
        monthlyAuditLimit: plan.monthlyAuditLimit,
        pdfExport: plan.pdfExport,
        scheduledAudits: plan.scheduledAudits
      } : null,
      usage: {
        projectCount: usage.projectCount,
        projectLimit: usage.projectLimit,
        auditCount: usage.auditCount,
        auditLimit: usage.auditLimit,
        projectsRemaining: usage.projectsRemaining,
        auditsRemaining: usage.auditsRemaining
      },
      invoices: invoices.map(inv => ({
        id: inv.id,
        amountToman: inv.amountToman,
        status: inv.status,
        plan: inv.plan.name,
        createdAt: inv.createdAt,
        paidAt: inv.paidAt
      })),
      requestId
    }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return respondJson({
      error: "INTERNAL_ERROR",
      requestId
    }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
