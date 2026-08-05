import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  markOrderCheckoutProviderRequestStarted,
  prepareOrderCheckout,
} from "./order-checkout";

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
  return {
    run,
    email: `recovery-${suffix}@example.com`,
    domain: "https://example.com/",
    normalizedUrl: "https://example.com/",
  };
}

describePostgres("order checkout recovery — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    await prisma.auditOrderEvent.deleteMany();
    await prisma.auditOrder.deleteMany();
    await prisma.auditLead.deleteMany();
    await prisma.reportShare.deleteMany();
    await prisma.auditRun.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blocks a second checkout when an external provider request may have been sent", async () => {
    const data = await fixture();
    const first = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:00:00.000Z"),
    });
    if (first.kind !== "CLAIMED") throw new Error("expected claimed checkout");

    await markOrderCheckoutProviderRequestStarted({
      orderId: first.order.id,
      callbackRef: first.callbackRef,
      provider: "MOCK",
    });

    await expect(prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:05:00.000Z"),
    })).rejects.toMatchObject({ code: "ORDER_CHECKOUT_RECONCILIATION_REQUIRED" });

    expect(await prisma.auditOrder.count()).toBe(1);
    expect(await prisma.auditOrder.findUnique({ where: { id: first.order.id } })).toMatchObject({
      status: "PENDING",
      providerRef: null,
    });
    expect(await prisma.auditOrderEvent.count({
      where: { orderId: first.order.id, kind: "CHECKOUT_PROVIDER_REQUEST_STARTED" },
    })).toBe(1);
  });

  it("reconstructs and persists a missing redirect event from validated provider state", async () => {
    const data = await fixture();
    const first = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:00:00.000Z"),
    });
    if (first.kind !== "CLAIMED") throw new Error("expected claimed checkout");

    await prisma.auditOrder.update({
      where: { id: first.order.id },
      data: { providerRef: `MOCK-${first.order.id}` },
    });

    const recovered = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:00:10.000Z"),
    });

    expect(recovered).toMatchObject({
      kind: "READY",
      order: { id: first.order.id },
      reused: true,
    });
    if (recovered.kind !== "READY") throw new Error("expected recovered checkout");
    expect(recovered.redirectUrl).toContain("/api/payments/callback?provider=MOCK");

    const event = await prisma.auditOrderEvent.findFirstOrThrow({
      where: { orderId: first.order.id, kind: "CHECKOUT_CREATED" },
    });
    expect(event.payload).toMatchObject({ recovered: true, provider: "MOCK" });
    expect(await prisma.auditOrder.count()).toBe(1);
  });

  it("fails closed when a persisted provider reference cannot be safely reconstructed", async () => {
    const data = await fixture();
    const first = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
    });
    if (first.kind !== "CLAIMED") throw new Error("expected claimed checkout");

    await prisma.auditOrder.update({
      where: { id: first.order.id },
      data: { providerRef: "MOCK-unrelated-order" },
    });

    await expect(prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
    })).rejects.toMatchObject({ code: "ORDER_CHECKOUT_RECONCILIATION_REQUIRED" });
    expect(await prisma.auditOrder.count()).toBe(1);
  });
});
