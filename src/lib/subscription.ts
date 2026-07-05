import { prisma } from "./db";
import { getPlan, type PlanConfig, type PlanCode, DEFAULT_PLAN } from "./plans";

export type SubscriptionStatus = "ACTIVE" | "PENDING" | "PAST_DUE" | "CANCELED";

export async function getActiveSubscription(organizationId: string) {
  return prisma.subscription.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getSubscriptionPlan(organizationId: string): Promise<PlanConfig> {
  const subscription = await getActiveSubscription(organizationId);
  if (!subscription) return DEFAULT_PLAN;
  return getPlan(subscription.plan.code as PlanCode);
}

export async function createSubscription(input: {
  organizationId: string;
  planCode: PlanCode;
  invoiceId?: string;
}) {
  const plan = await prisma.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: input.organizationId,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    }
  });

  if (input.invoiceId) {
    await prisma.invoice.update({
      where: { id: input.invoiceId },
      data: { subscriptionId: subscription.id }
    });
  }

  return subscription;
}

export async function cancelSubscription(organizationId: string) {
  const subscription = await getActiveSubscription(organizationId);
  if (!subscription) return null;

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELED" }
  });
}

export async function recordUsage(input: {
  organizationId: string;
  type: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}) {
  return prisma.usageLedger.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      quantity: input.quantity ?? 1,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined
    }
  });
}

export async function getMonthlyUsage(organizationId: string, type: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await prisma.usageLedger.aggregate({
    where: {
      organizationId,
      type,
      createdAt: { gte: monthStart }
    },
    _sum: { quantity: true }
  });

  return result._sum.quantity ?? 0;
}

export async function createInvoice(input: {
  organizationId: string;
  planId: string;
  amountToman: number;
  subscriptionId?: string;
  provider?: string;
  callbackRef?: string;
}) {
  return prisma.invoice.create({
    data: {
      organizationId: input.organizationId,
      planId: input.planId,
      amountToman: input.amountToman,
      subscriptionId: input.subscriptionId,
      provider: (input.provider as "MOCK" | "ZARINPAL" | "IDPAY" | "PAYPING") ?? "MOCK",
      callbackRef: input.callbackRef,
      status: "PENDING"
    }
  });
}

export async function getInvoices(organizationId: string, limit = 20) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function findInvoiceByCallbackRef(callbackRef: string) {
  return prisma.invoice.findFirst({
    where: { callbackRef },
    include: { organization: true, plan: true, subscription: true }
  });
}

export async function activateInvoice(invoiceId: string) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date()
    }
  });
}
