import { prisma } from "./db";

export type BillingEventType =
  | "checkout_created"
  | "payment_success"
  | "payment_failed"
  | "subscription_created"
  | "subscription_upgraded"
  | "subscription_downgraded"
  | "subscription_canceled"
  | "subscription_reactivated"
  | "invoice_created"
  | "invoice_paid"
  | "invoice_failed";

export interface BillingEventData {
  entityType: "ORDER" | "SUBSCRIPTION" | "INVOICE";
  entityId: string;
  eventType: BillingEventType;
  organizationId: string;
  actor?: string;
  details?: Record<string, unknown>;
}

export async function logBillingEvent(data: BillingEventData) {
  return prisma.billingEvent.create({
    data: {
      organizationId: data.organizationId,
      entityType: data.entityType,
      entityId: data.entityId,
      eventType: data.eventType,
      actor: data.actor,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : undefined,
    },
  });
}

export async function getBillingEvents(params: {
  organizationId: string;
  eventType?: BillingEventType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {
    organizationId: params.organizationId,
  };

  if (params.eventType) {
    where.eventType = params.eventType;
  }

  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    };
  }

  const [events, total] = await Promise.all([
    prisma.billingEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    }),
    prisma.billingEvent.count({ where }),
  ]);

  return { events, total };
}
