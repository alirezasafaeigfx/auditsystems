import { PaymentProvider, Prisma } from "@prisma/client";
import { prisma } from "./db";

const VERIFICATION_LEASE_MS = 2 * 60 * 1000;
const MAX_TRANSACTION_RETRIES = 3;

const CALLBACK_ORDER_INCLUDE = {
  run: {
    select: {
      locale: true,
      shares: { orderBy: { createdAt: "desc" as const }, take: 1 },
    },
  },
  events: {
    where: { kind: "PAYMENT_VERIFICATION_STARTED" },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.AuditOrderInclude;

export type CallbackOrder = Prisma.AuditOrderGetPayload<{ include: typeof CALLBACK_ORDER_INCLUDE }>;

export type PaymentVerificationClaim =
  | { kind: "NOT_FOUND" }
  | { kind: "TERMINAL"; order: CallbackOrder }
  | { kind: "PROCESSING"; order: CallbackOrder; retryAfterSec: number }
  | { kind: "CLAIMED"; order: CallbackOrder; leaseEventId: string };

export class PaymentCallbackStateError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PaymentCallbackStateError";
  }
}

function isRetryable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
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

async function lockByCallbackRef(tx: Prisma.TransactionClient, callbackRef: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "AuditOrder"
    SET "status" = "status"
    WHERE "callbackRef" = ${callbackRef}
  `;
}

async function lockById(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "AuditOrder"
    SET "status" = "status"
    WHERE "id" = ${orderId}
  `;
}

function latestLease(order: CallbackOrder) {
  return order.events[0] ?? null;
}

export async function claimPaymentVerification(input: {
  callbackRef: string;
  provider: PaymentProvider;
  now?: Date;
}): Promise<PaymentVerificationClaim> {
  const now = input.now ?? new Date();
  const staleBefore = new Date(now.getTime() - VERIFICATION_LEASE_MS);

  return withSerializableRetry(async (tx) => {
    await lockByCallbackRef(tx, input.callbackRef);
    const order = await tx.auditOrder.findFirst({
      where: { callbackRef: input.callbackRef },
      include: CALLBACK_ORDER_INCLUDE,
    });
    if (!order) return { kind: "NOT_FOUND" };
    if (order.provider !== input.provider) {
      throw new PaymentCallbackStateError("PROVIDER_MISMATCH");
    }
    if (order.status !== "PENDING") {
      return { kind: "TERMINAL", order };
    }

    const lease = latestLease(order);
    if (lease && lease.createdAt > staleBefore) {
      const remainingMs = VERIFICATION_LEASE_MS - (now.getTime() - lease.createdAt.getTime());
      return {
        kind: "PROCESSING",
        order,
        retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
      };
    }

    const leaseEvent = await tx.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "PAYMENT_VERIFICATION_STARTED",
        payload: { provider: input.provider },
      },
    });
    const claimedOrder = await tx.auditOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: CALLBACK_ORDER_INCLUDE,
    });
    return { kind: "CLAIMED", order: claimedOrder, leaseEventId: leaseEvent.id };
  });
}

export async function finalizePaymentVerification(input: {
  orderId: string;
  leaseEventId: string;
  paid: boolean;
  provider: PaymentProvider;
  providerRef: string | null;
  callbackStatus: string | null;
}): Promise<{ order: CallbackOrder; reused: boolean }> {
  return withSerializableRetry(async (tx) => {
    await lockById(tx, input.orderId);
    const order = await tx.auditOrder.findUnique({
      where: { id: input.orderId },
      include: CALLBACK_ORDER_INCLUDE,
    });
    if (!order) throw new PaymentCallbackStateError("ORDER_NOT_FOUND");
    if (order.provider !== input.provider) throw new PaymentCallbackStateError("PROVIDER_MISMATCH");
    if (order.status === "PAID" || order.status === "FAILED") {
      return { order, reused: true };
    }
    if (order.status !== "PENDING") {
      throw new PaymentCallbackStateError("PAYMENT_STATE_CHANGED");
    }
    if (latestLease(order)?.id !== input.leaseEventId) {
      throw new PaymentCallbackStateError("STALE_PAYMENT_VERIFICATION");
    }

    const nextStatus = input.paid ? "PAID" : "FAILED";
    await tx.auditOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paidAt: input.paid ? new Date() : null,
        providerRef: input.providerRef ?? order.providerRef,
      },
    });
    await tx.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: input.paid ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
        payload: {
          provider: input.provider,
          callbackStatus: input.callbackStatus?.slice(0, 32) || null,
          providerRef: input.providerRef?.slice(0, 128) || null,
          leaseEventId: input.leaseEventId,
        },
      },
    });

    const updated = await tx.auditOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: CALLBACK_ORDER_INCLUDE,
    });
    return { order: updated, reused: false };
  });
}

export async function releasePaymentVerification(input: {
  orderId: string;
  leaseEventId: string;
  code: string;
}): Promise<void> {
  await withSerializableRetry(async (tx) => {
    await lockById(tx, input.orderId);
    const order = await tx.auditOrder.findUnique({
      where: { id: input.orderId },
      include: CALLBACK_ORDER_INCLUDE,
    });
    if (!order || order.status !== "PENDING") return;
    if (latestLease(order)?.id !== input.leaseEventId) return;

    await tx.auditOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "PAYMENT_VERIFICATION_ERROR",
        payload: {
          leaseEventId: input.leaseEventId,
          code: input.code.slice(0, 80),
        },
      },
    });
  });
}
