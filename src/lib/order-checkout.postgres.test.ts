import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  completeOrderCheckout,
  failOrderCheckout,
  prepareOrderCheckout,
} from "./order-checkout";

const integrationEnabled = process.env.ORDER_CHECKOUT_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;
let fixtureSequence = 0;

async function fixture() {
  fixtureSequence += 1;
  const suffix = `${fixtureSequence}-${Date.now()}`;
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
    email: `buyer-${suffix}@example.com`,
    domain: "https://example.com/",
    normalizedUrl: "https://example.com/",
  };
}

describePostgres("order checkout — PostgreSQL", () => {
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

  it("allows one checkout initializer across concurrent requests", async () => {
    const data = await fixture();
    const input = {
      runId: data.run.id,
      email: data.email,
      provider: "MOCK" as const,
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:00:00.000Z"),
    };

    const results = await Promise.all([
      prepareOrderCheckout(input),
      prepareOrderCheckout(input),
    ]);

    expect(results.filter((result) => result.kind === "CLAIMED")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "INITIALIZING")).toHaveLength(1);
    expect(await prisma.auditOrder.count()).toBe(1);
    expect(await prisma.auditLead.count()).toBe(1);
    expect(await prisma.auditOrderEvent.count({ where: { kind: "ORDER_CREATED" } })).toBe(1);

    const order = await prisma.auditOrder.findFirstOrThrow();
    const lead = await prisma.auditLead.findFirstOrThrow();
    expect(order.leadId).toBe(lead.id);
    expect(lead.consentPrivacy).toBe(true);
  });

  it("reuses the completed checkout URL without creating another order", async () => {
    const data = await fixture();
    const prepared = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:00:00.000Z"),
    });
    expect(prepared.kind).toBe("CLAIMED");
    if (prepared.kind !== "CLAIMED") throw new Error("expected claimed checkout");

    const completed = await completeOrderCheckout({
      orderId: prepared.order.id,
      callbackRef: prepared.callbackRef,
      providerRef: `MOCK-${prepared.order.id}`,
      redirectUrl: "https://audit.example.com/api/payments/callback?provider=MOCK",
      provider: "MOCK",
    });
    expect(completed.reused).toBe(false);

    const replay = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:00:10.000Z"),
    });

    expect(replay).toMatchObject({
      kind: "READY",
      order: { id: prepared.order.id },
      redirectUrl: "https://audit.example.com/api/payments/callback?provider=MOCK",
      reused: true,
    });
    expect(await prisma.auditOrder.count()).toBe(1);
    expect(await prisma.auditOrderEvent.count({ where: { kind: "CHECKOUT_CREATED" } })).toBe(1);
  });

  it("marks provider failures terminal and allows a fresh pending attempt", async () => {
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

    await failOrderCheckout({
      orderId: first.order.id,
      callbackRef: first.callbackRef,
      code: "PAYMENT_PROVIDER_TIMEOUT",
    });

    const second = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:01:00.000Z"),
    });
    expect(second.kind).toBe("CLAIMED");
    if (second.kind !== "CLAIMED") throw new Error("expected second claimed checkout");
    expect(second.order.id).not.toBe(first.order.id);

    expect(await prisma.auditOrder.count({ where: { status: "PENDING" } })).toBe(1);
    expect(await prisma.auditOrder.count({ where: { status: "FAILED" } })).toBe(1);
    expect(await prisma.auditLead.count()).toBe(1);
    expect(await prisma.auditOrderEvent.count({ where: { kind: "CHECKOUT_FAILED" } })).toBe(1);
  });

  it("expires an abandoned initializer before creating a new order", async () => {
    const data = await fixture();
    const initializedAt = new Date("2026-08-05T12:00:00.000Z");
    const first = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: initializedAt,
    });
    if (first.kind !== "CLAIMED") throw new Error("expected claimed checkout");

    // createdAt is database-authored in production. Backdate the persisted row
    // explicitly so this test does not depend on the runner's wall clock.
    await prisma.auditOrder.update({
      where: { id: first.order.id },
      data: { createdAt: initializedAt },
    });

    const second = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
      now: new Date("2026-08-05T12:03:00.000Z"),
    });

    expect(second.kind).toBe("CLAIMED");
    expect(await prisma.auditOrder.findUnique({ where: { id: first.order.id } })).toMatchObject({ status: "FAILED" });
    expect(await prisma.auditOrderEvent.count({ where: { kind: "CHECKOUT_ABANDONED" } })).toBe(1);
  });

  it("returns a paid order before considering provider-specific pending state", async () => {
    const data = await fixture();
    const prepared = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "MOCK",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
    });
    if (prepared.kind !== "CLAIMED") throw new Error("expected claimed checkout");
    await prisma.auditOrder.update({
      where: { id: prepared.order.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    const result = await prepareOrderCheckout({
      runId: data.run.id,
      email: data.email,
      provider: "ZARINPAL",
      domain: data.domain,
      normalizedUrl: data.normalizedUrl,
    });

    expect(result).toMatchObject({ kind: "PAID", order: { id: prepared.order.id } });
    expect(await prisma.auditOrder.count()).toBe(1);
  });
});
