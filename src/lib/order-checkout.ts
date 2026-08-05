import crypto from "node:crypto";
import {
  AuditOrder,
  AuditOrderEvent,
  PaymentProvider,
  Prisma,
} from "@prisma/client";
import { prisma } from "./db";
import { reconstructCheckoutRedirect } from "./payments";

export const REPORT_UNLOCK_AMOUNT_TOMAN = 290_000;
const CHECKOUT_INITIALIZATION_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_TRANSACTION_RETRIES = 3;
const VERIFICATION_EVENT_KINDS = [
  "PAYMENT_VERIFICATION_STARTED",
  "PAYMENT_VERIFICATION_ERROR",
  "PAYMENT_VERIFICATION_RELEASED",
] as const;

type OrderWithEvents = AuditOrder & { events: AuditOrderEvent[] };

export type PreparedOrderCheckout =
  | { kind: "PAID"; order: AuditOrder }
  | { kind: "READY"; order: AuditOrder; redirectUrl: string; reused: true }
  | { kind: "INITIALIZING"; order: AuditOrder; retryAfterSec: number }
  | { kind: "CLAIMED"; order: AuditOrder; callbackRef: string; reused: false };

export class OrderCheckoutError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "OrderCheckoutError";
  }
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034" || error.code === "P2002") return true;
  if (error.code !== "P2010") return false;
  const sqlState = String(error.meta?.code ?? "");
  return sqlState === "40001" || sqlState === "40P01";
}

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_TRANSACTION_RETRIES) throw error;
    }
  }
  throw lastError;
}

function checkoutUrlFromEvents(order: OrderWithEvents): string | null {
  const event = order.events.find((candidate) => candidate.kind === "CHECKOUT_CREATED");
  const payload = event?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const redirectUrl = (payload as Record<string, unknown>).redirectUrl;
  if (typeof redirectUrl !== "string" || !redirectUrl.trim()) return null;
  return redirectUrl;
}

function activeVerificationLease(order: OrderWithEvents): AuditOrderEvent | null {
  const latest = order.events.find((candidate) =>
    VERIFICATION_EVENT_KINDS.includes(candidate.kind as (typeof VERIFICATION_EVENT_KINDS)[number]));
  return latest?.kind === "PAYMENT_VERIFICATION_STARTED" ? latest : null;
}

function hasProviderRequestMarker(order: OrderWithEvents): boolean {
  return order.events.some((candidate) => candidate.kind === "CHECKOUT_PROVIDER_REQUEST_STARTED");
}

async function resolvePersistedCheckoutUrl(
  tx: Prisma.TransactionClient,
  order: OrderWithEvents,
): Promise<string | null> {
  const eventUrl = checkoutUrlFromEvents(order);
  if (eventUrl) return eventUrl;
  if (!order.providerRef) return null;
  if (!order.callbackRef) {
    throw new OrderCheckoutError("ORDER_CHECKOUT_RECONCILIATION_REQUIRED");
  }

  const recoveredUrl = reconstructCheckoutRedirect({
    provider: order.provider,
    providerRef: order.providerRef,
    callbackRef: order.callbackRef,
    orderId: order.id,
  });
  if (!recoveredUrl) {
    throw new OrderCheckoutError("ORDER_CHECKOUT_RECONCILIATION_REQUIRED");
  }

  await tx.auditOrderEvent.create({
    data: {
      orderId: order.id,
      kind: "CHECKOUT_CREATED",
      payload: {
        provider: order.provider,
        callbackRef: order.callbackRef,
        redirectUrl: recoveredUrl,
        recovered: true,
      },
    },
  });
  return recoveredUrl;
}

async function updateLeadForOrder(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    runId: string;
    email: string;
    domain: string;
    normalizedUrl: string | null;
  },
): Promise<void> {
  let lead = await tx.auditLead.findFirst({
    where: { runId: input.runId, email: input.email },
    orderBy: { createdAt: "desc" },
  });

  if (!lead) {
    lead = await tx.auditLead.create({
      data: {
        runId: input.runId,
        email: input.email,
        domain: input.domain,
        normalizedUrl: input.normalizedUrl,
        businessType: "unknown",
        primaryConcern: "Report unlock or order request",
        consentPrivacy: true,
        leadSource: "report_unlock",
        sourcePlacement: "orders_api",
        sourceOffer: "pdf_export",
        status: "REPORT_READY",
      },
    });
  } else if (lead.status !== "CONVERTED" && lead.status !== "LOST" && lead.status !== "REPORT_READY") {
    lead = await tx.auditLead.update({
      where: { id: lead.id },
      data: { status: "REPORT_READY", consentPrivacy: true },
    });
  }

  await tx.auditOrder.update({
    where: { id: input.orderId },
    data: { leadId: lead.id },
  });
}

async function readPending(
  tx: Prisma.TransactionClient,
  input: { runId: string; email: string; provider: PaymentProvider },
): Promise<OrderWithEvents | null> {
  return tx.auditOrder.findFirst({
    where: {
      runId: input.runId,
      email: input.email,
      provider: input.provider,
      status: "PENDING",
    },
    include: {
      events: {
        where: {
          kind: {
            in: [
              "CHECKOUT_CREATED",
              "CHECKOUT_PROVIDER_REQUEST_STARTED",
              ...VERIFICATION_EVENT_KINDS,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function prepareOrderCheckout(input: {
  runId: string;
  email: string;
  provider: PaymentProvider;
  domain: string;
  normalizedUrl: string | null;
  now?: Date;
}): Promise<PreparedOrderCheckout> {
  const now = input.now ?? new Date();
  const staleBefore = new Date(now.getTime() - CHECKOUT_INITIALIZATION_TIMEOUT_MS);

  return withSerializableRetry(async (tx) => {
    const paid = await tx.auditOrder.findFirst({
      where: { runId: input.runId, email: input.email, status: "PAID" },
      orderBy: { createdAt: "desc" },
    });
    if (paid) return { kind: "PAID", order: paid };

    let pending = await readPending(tx, input);
    if (pending) {
      const lease = activeVerificationLease(pending);
      if (lease && lease.createdAt > staleBefore) {
        const remainingMs = CHECKOUT_INITIALIZATION_TIMEOUT_MS - (now.getTime() - lease.createdAt.getTime());
        return {
          kind: "INITIALIZING",
          order: pending,
          retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
        };
      }
      if (lease) {
        await tx.auditOrderEvent.create({
          data: {
            orderId: pending.id,
            kind: "PAYMENT_VERIFICATION_RELEASED",
            payload: { reason: "LEASE_EXPIRED", leaseEventId: lease.id },
          },
        });
      }

      const redirectUrl = await resolvePersistedCheckoutUrl(tx, pending);
      if (pending.providerRef && redirectUrl) {
        return { kind: "READY", order: pending, redirectUrl, reused: true };
      }
      if (hasProviderRequestMarker(pending)) {
        throw new OrderCheckoutError("ORDER_CHECKOUT_RECONCILIATION_REQUIRED");
      }

      if (pending.createdAt > staleBefore) {
        const remainingMs = CHECKOUT_INITIALIZATION_TIMEOUT_MS - (now.getTime() - pending.createdAt.getTime());
        return {
          kind: "INITIALIZING",
          order: pending,
          retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
        };
      }

      const abandoned = await tx.auditOrder.updateMany({
        where: {
          id: pending.id,
          status: "PENDING",
          providerRef: null,
          createdAt: { lte: staleBefore },
        },
        data: { status: "FAILED" },
      });
      if (abandoned.count === 1) {
        await tx.auditOrderEvent.create({
          data: {
            orderId: pending.id,
            kind: "CHECKOUT_ABANDONED",
            payload: { reason: "INITIALIZATION_TIMEOUT" },
          },
        });
        pending = null;
      } else {
        const refreshed = await readPending(tx, input);
        if (!refreshed) throw new OrderCheckoutError("ORDER_CHECKOUT_STATE_CHANGED");
        const refreshedUrl = await resolvePersistedCheckoutUrl(tx, refreshed);
        if (refreshed.providerRef && refreshedUrl) {
          return { kind: "READY", order: refreshed, redirectUrl: refreshedUrl, reused: true };
        }
        if (hasProviderRequestMarker(refreshed)) {
          throw new OrderCheckoutError("ORDER_CHECKOUT_RECONCILIATION_REQUIRED");
        }
        return { kind: "INITIALIZING", order: refreshed, retryAfterSec: 2 };
      }
    }

    const callbackRef = crypto.randomUUID().replace(/-/g, "");
    const order = await tx.auditOrder.create({
      data: {
        runId: input.runId,
        email: input.email,
        provider: input.provider,
        amountToman: REPORT_UNLOCK_AMOUNT_TOMAN,
        status: "PENDING",
        callbackRef,
      },
    });

    await updateLeadForOrder(tx, {
      orderId: order.id,
      runId: input.runId,
      email: input.email,
      domain: input.domain,
      normalizedUrl: input.normalizedUrl,
    });

    await tx.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "ORDER_CREATED",
        payload: { provider: input.provider, source: "report_unlock" },
      },
    });

    return { kind: "CLAIMED", order, callbackRef, reused: false };
  });
}

export async function markOrderCheckoutProviderRequestStarted(input: {
  orderId: string;
  callbackRef: string;
  provider: PaymentProvider;
}): Promise<void> {
  await withSerializableRetry(async (tx) => {
    await tx.$executeRaw`
      UPDATE "AuditOrder"
      SET "status" = "status"
      WHERE "id" = ${input.orderId}
    `;
    const order = await tx.auditOrder.findUnique({
      where: { id: input.orderId },
      include: {
        events: {
          where: { kind: "CHECKOUT_PROVIDER_REQUEST_STARTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!order || order.status !== "PENDING" || order.callbackRef !== input.callbackRef || order.provider !== input.provider) {
      throw new OrderCheckoutError("ORDER_CHECKOUT_NOT_PENDING");
    }
    if (order.providerRef) throw new OrderCheckoutError("ORDER_CHECKOUT_ALREADY_INITIALIZED");
    if (order.events.length > 0) return;

    await tx.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "CHECKOUT_PROVIDER_REQUEST_STARTED",
        payload: { provider: input.provider },
      },
    });
  });
}

export async function completeOrderCheckout(input: {
  orderId: string;
  callbackRef: string;
  providerRef: string;
  redirectUrl: string;
  provider: PaymentProvider;
}): Promise<{ order: AuditOrder; redirectUrl: string; reused: boolean }> {
  return withSerializableRetry(async (tx) => {
    const updated = await tx.auditOrder.updateMany({
      where: {
        id: input.orderId,
        status: "PENDING",
        callbackRef: input.callbackRef,
        providerRef: null,
      },
      data: { providerRef: input.providerRef },
    });

    if (updated.count === 1) {
      await tx.auditOrderEvent.create({
        data: {
          orderId: input.orderId,
          kind: "CHECKOUT_CREATED",
          payload: {
            provider: input.provider,
            callbackRef: input.callbackRef,
            redirectUrl: input.redirectUrl,
          },
        },
      });

      const order = await tx.auditOrder.findUniqueOrThrow({ where: { id: input.orderId } });
      return { order, redirectUrl: input.redirectUrl, reused: false };
    }

    const existing = await tx.auditOrder.findUnique({
      where: { id: input.orderId },
      include: {
        events: {
          where: { kind: { in: ["CHECKOUT_CREATED", "CHECKOUT_PROVIDER_REQUEST_STARTED"] } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!existing || existing.status !== "PENDING") {
      throw new OrderCheckoutError("ORDER_CHECKOUT_NOT_PENDING");
    }
    const redirectUrl = await resolvePersistedCheckoutUrl(tx, existing);
    if (!existing.providerRef || !redirectUrl) {
      throw new OrderCheckoutError("ORDER_CHECKOUT_STATE_INVALID");
    }
    return { order: existing, redirectUrl, reused: true };
  });
}

export async function failOrderCheckout(input: {
  orderId: string;
  callbackRef: string;
  code: string;
}): Promise<void> {
  await withSerializableRetry(async (tx) => {
    const failed = await tx.auditOrder.updateMany({
      where: {
        id: input.orderId,
        status: "PENDING",
        callbackRef: input.callbackRef,
        providerRef: null,
      },
      data: { status: "FAILED" },
    });
    if (failed.count !== 1) return;

    await tx.auditOrderEvent.create({
      data: {
        orderId: input.orderId,
        kind: "CHECKOUT_FAILED",
        payload: { code: input.code.slice(0, 80) },
      },
    });
  });
}
