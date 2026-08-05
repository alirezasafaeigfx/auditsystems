import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  claimPaymentVerification,
  finalizePaymentVerification,
  releasePaymentVerification,
} from "./payment-callback-state";

const integrationEnabled = process.env.ORDER_CHECKOUT_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;
let sequence = 0;

async function fixture() {
  sequence += 1;
  const suffix = `${sequence}-${Date.now()}`;
  const run = await prisma.auditRun.create({
    data: {
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
      status: "SUCCEEDED",
      reportStatus: "DELIVERED",
      locale: "fa",
    },
  });
  await prisma.reportShare.create({
    data: { runId: run.id, token: `callback-share-${suffix}` },
  });
  const order = await prisma.auditOrder.create({
    data: {
      runId: run.id,
      email: `callback-${suffix}@example.com`,
      amountToman: 290000,
      status: "PENDING",
      provider: "MOCK",
      providerRef: `MOCK-order-${suffix}`,
      callbackRef: `callback-${suffix}`,
    },
  });
  return { run, order };
}

describePostgres("payment callback state — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    await prisma.auditOrderEvent.deleteMany();
    await prisma.auditOrder.deleteMany();
    await prisma.reportShare.deleteMany();
    await prisma.auditRun.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("grants one verification lease across concurrent callbacks", async () => {
    const { order } = await fixture();
    const now = new Date("2026-08-05T12:00:00.000Z");

    const results = await Promise.all([
      claimPaymentVerification({ callbackRef: order.callbackRef!, provider: "MOCK", now }),
      claimPaymentVerification({ callbackRef: order.callbackRef!, provider: "MOCK", now }),
    ]);

    expect(results.filter((result) => result.kind === "CLAIMED")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "PROCESSING")).toHaveLength(1);
    expect(await prisma.auditOrderEvent.count({ where: { kind: "PAYMENT_VERIFICATION_STARTED" } })).toBe(1);
  });

  it("finalizes one lease idempotently under concurrent completion", async () => {
    const { order } = await fixture();
    const claim = await claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "MOCK",
      now: new Date("2026-08-05T12:00:00.000Z"),
    });
    if (claim.kind !== "CLAIMED") throw new Error("expected claimed verification");

    const input = {
      orderId: order.id,
      leaseEventId: claim.leaseEventId,
      paid: true,
      provider: "MOCK" as const,
      providerRef: order.providerRef,
      callbackStatus: "OK",
    };
    const results = await Promise.all([
      finalizePaymentVerification(input),
      finalizePaymentVerification(input),
    ]);

    expect(results.filter((result) => result.reused)).toHaveLength(1);
    expect(results.filter((result) => !result.reused)).toHaveLength(1);
    expect(await prisma.auditOrder.findUnique({ where: { id: order.id } })).toMatchObject({ status: "PAID" });
    expect(await prisma.auditOrderEvent.count({ where: { kind: "PAYMENT_CONFIRMED" } })).toBe(1);
  });

  it("rejects a stale verifier after a newer lease generation is claimed", async () => {
    const { order } = await fixture();
    const first = await claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "MOCK",
      now: new Date("2026-08-05T12:00:00.000Z"),
    });
    const second = await claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "MOCK",
      now: new Date("2026-08-05T12:03:00.000Z"),
    });
    if (first.kind !== "CLAIMED" || second.kind !== "CLAIMED") throw new Error("expected two lease generations");

    await expect(finalizePaymentVerification({
      orderId: order.id,
      leaseEventId: first.leaseEventId,
      paid: true,
      provider: "MOCK",
      providerRef: order.providerRef,
      callbackStatus: "OK",
    })).rejects.toMatchObject({ code: "STALE_PAYMENT_VERIFICATION" });

    await expect(finalizePaymentVerification({
      orderId: order.id,
      leaseEventId: second.leaseEventId,
      paid: true,
      provider: "MOCK",
      providerRef: order.providerRef,
      callbackStatus: "OK",
    })).resolves.toMatchObject({ reused: false, order: { status: "PAID" } });
  });

  it("invalidates a released lease immediately so verification can retry", async () => {
    const { order } = await fixture();
    const first = await claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "MOCK",
      now: new Date("2026-08-05T12:00:00.000Z"),
    });
    if (first.kind !== "CLAIMED") throw new Error("expected claimed verification");

    await releasePaymentVerification({
      orderId: order.id,
      leaseEventId: first.leaseEventId,
      code: "PAYMENT_PROVIDER_TIMEOUT",
    });

    const second = await claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "MOCK",
      now: new Date("2026-08-05T12:00:01.000Z"),
    });
    expect(second.kind).toBe("CLAIMED");
    if (second.kind !== "CLAIMED") throw new Error("expected replacement lease");
    expect(second.leaseEventId).not.toBe(first.leaseEventId);
    expect(await prisma.auditOrderEvent.count({ where: { kind: "PAYMENT_VERIFICATION_ERROR" } })).toBe(1);
  });

  it("fails closed on provider mismatch before creating a lease", async () => {
    const { order } = await fixture();

    await expect(claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "ZARINPAL",
    })).rejects.toMatchObject({ code: "PROVIDER_MISMATCH" });
    expect(await prisma.auditOrderEvent.count({ where: { kind: "PAYMENT_VERIFICATION_STARTED" } })).toBe(0);
  });

  it("records a failed verification once and treats repeats as terminal", async () => {
    const { order } = await fixture();
    const claim = await claimPaymentVerification({
      callbackRef: order.callbackRef!,
      provider: "MOCK",
    });
    if (claim.kind !== "CLAIMED") throw new Error("expected claimed verification");

    const first = await finalizePaymentVerification({
      orderId: order.id,
      leaseEventId: claim.leaseEventId,
      paid: false,
      provider: "MOCK",
      providerRef: order.providerRef,
      callbackStatus: "NOK",
    });
    const repeat = await finalizePaymentVerification({
      orderId: order.id,
      leaseEventId: claim.leaseEventId,
      paid: false,
      provider: "MOCK",
      providerRef: order.providerRef,
      callbackStatus: "NOK",
    });

    expect(first).toMatchObject({ reused: false, order: { status: "FAILED" } });
    expect(repeat).toMatchObject({ reused: true, order: { status: "FAILED" } });
    expect(await prisma.auditOrderEvent.count({ where: { kind: "PAYMENT_FAILED" } })).toBe(1);
  });
});
