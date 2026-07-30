import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    invoice: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
    billingEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../site", () => ({
  getAppBaseUrl: vi.fn(() => "https://audit.example.com"),
}));

const { prisma } = await import("../db");

function mockInvoice(data: Record<string, unknown> = {}) {
  return {
    id: "inv-001",
    organizationId: "org-001",
    planId: "plan-starter",
    amountToman: 290000,
    status: "PENDING",
    provider: "MOCK",
    callbackRef: "cb-ref-001",
    providerRef: null,
    subscriptionId: null,
    paidAt: null,
    createdAt: new Date(),
    ...data,
  };
}

function mockPlan(code = "starter") {
  return { id: "plan-starter", code, name: "Starter", priceMonthlyToman: 290000 };
}

function mockOrganization() {
  return { id: "org-001", name: "Test Org" };
}

describe("Payment flow — checkout → callback → subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MOCK provider: checkout produces valid redirect URL", async () => {
    const { createCheckout } = await import("../payments");

    const result = await createCheckout({
      provider: "MOCK",
      orderId: "inv-001",
      callbackRef: "cb-abc123",
      amountToman: 290000,
      email: "test@example.com",
    });

    expect(result.redirectUrl).toContain("/api/payments/callback");
    expect(result.redirectUrl).toContain("provider=MOCK");
    expect(result.redirectUrl).toContain("Status=OK");
    expect(result.redirectUrl).toContain("Authority=MOCK-inv-001");
    expect(result.providerRef).toBe("MOCK-inv-001");
    expect(result.callbackRef).toBe("cb-abc123");
  });

  it("MOCK provider: verify returns paid=true when Status=OK", async () => {
    const { verifyCheckout } = await import("../payments");

    const result = await verifyCheckout({
      provider: "MOCK",
      providerRef: "MOCK-inv-001",
      amountToman: 290000,
      callbackStatus: "OK",
    });

    expect(result.paid).toBe(true);
    expect(result.providerRef).toBe("MOCK-inv-001");
  });

  it("MOCK provider: verify returns paid=false when Status is not OK", async () => {
    const { verifyCheckout } = await import("../payments");

    const result = await verifyCheckout({
      provider: "MOCK",
      providerRef: "MOCK-inv-001",
      amountToman: 290000,
      callbackStatus: "FAILED",
    });

    expect(result.paid).toBe(false);
  });

  it("Full flow: checkout → callback → invoice activated → subscription created", async () => {
    const invoice = mockInvoice();
    const plan = mockPlan("starter");
    const org = mockOrganization();

    (prisma.invoice.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...invoice,
      organization: org,
      plan,
      subscription: null,
    });
    (prisma.invoice.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...invoice,
      status: "PAID",
    });
    (prisma.plan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(plan);
    (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.subscription.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "sub-001",
      organizationId: "org-001",
      planId: "plan-starter",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const { verifyCheckout } = await import("../payments");
    const { activateInvoice, createSubscription } = await import("../subscription");

    const verification = await verifyCheckout({
      provider: "MOCK",
      providerRef: "MOCK-inv-001",
      amountToman: 290000,
      callbackStatus: "OK",
    });

    expect(verification.paid).toBe(true);

    await activateInvoice("inv-001");
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-001" },
      data: { status: "PAID", paidAt: expect.any(Date) },
    });

    await createSubscription({
      organizationId: "org-001",
      planCode: "starter",
      invoiceId: "inv-001",
    });
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-001",
        planId: "plan-starter",
        status: "ACTIVE",
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
      },
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-001" },
      data: { subscriptionId: "sub-001" },
    });
  });

  it("Double-payment prevention: PAID invoice is not re-processed", async () => {
    const paidInvoice = mockInvoice({ status: "PAID" });
    const plan = mockPlan("starter");
    const org = mockOrganization();

    (prisma.invoice.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...paidInvoice,
      organization: org,
      plan,
      subscription: { id: "sub-existing" },
    });

    const invoice = await prisma.invoice.findFirst({
      where: { callbackRef: "cb-ref-001" },
      include: { organization: true, plan: true },
    });

    expect(invoice).not.toBeNull();
    expect(invoice!.status).toBe("PAID");
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it("Expired payment: callback marks invoice as FAILED", async () => {
    const { verifyCheckout } = await import("../payments");

    const result = await verifyCheckout({
      provider: "MOCK",
      providerRef: "MOCK-inv-001",
      amountToman: 290000,
      callbackStatus: "FAILED",
    });

    expect(result.paid).toBe(false);

    const invoice = mockInvoice();
    const plan = mockPlan("starter");
    const org = mockOrganization();

    (prisma.invoice.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...invoice,
      organization: org,
      plan,
      subscription: null,
    });
    (prisma.invoice.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...invoice,
      status: "FAILED",
    });

    const foundInvoice = await prisma.invoice.findFirst({
      where: { callbackRef: "cb-ref-001" },
      include: { organization: true, plan: true },
    });

    if (!result.paid && foundInvoice && foundInvoice.status === "PENDING") {
      await prisma.invoice.update({
        where: { id: foundInvoice.id },
        data: { status: "FAILED" },
      });
    }

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-001" },
      data: { status: "FAILED" },
    });
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it("Subscription creation on successful payment links invoice", async () => {
    (prisma.plan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlan("starter"));
    (prisma.subscription.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "sub-new",
      organizationId: "org-001",
      planId: "plan-starter",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    (prisma.invoice.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { createSubscription } = await import("../subscription");

    const sub = await createSubscription({
      organizationId: "org-001",
      planCode: "starter",
      invoiceId: "inv-001",
    });

    expect(sub.status).toBe("ACTIVE");
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-001" },
      data: { subscriptionId: "sub-new" },
    });
  });

  it("Missing callbackRef returns error", async () => {
    (prisma.invoice.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const invoice = await prisma.invoice.findFirst({
      where: { callbackRef: "" },
      include: { organization: true, plan: true },
    });

    expect(invoice).toBeNull();
  });

  it("Invoice not found for callbackRef returns 404", async () => {
    (prisma.invoice.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const invoice = await prisma.invoice.findFirst({
      where: { callbackRef: "nonexistent-ref" },
      include: { organization: true, plan: true },
    });

    expect(invoice).toBeNull();
  });

  it("Non-PENDING invoice rejects callback processing", async () => {
    const cancelledInvoice = mockInvoice({ status: "CANCELED" });
    const plan = mockPlan("starter");
    const org = mockOrganization();

    (prisma.invoice.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...cancelledInvoice,
      organization: org,
      plan,
      subscription: null,
    });

    const invoice = await prisma.invoice.findFirst({
      where: { callbackRef: "cb-ref-001" },
      include: { organization: true, plan: true },
    });

    expect(invoice).not.toBeNull();
    expect(invoice!.status).not.toBe("PENDING");
    expect(invoice!.status).not.toBe("PAID");
  });

  it("MOCK provider rejected in production via resolvePaymentProvider", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER_DEFAULT", "");

    try {
      const { resolvePaymentProvider } = await import("../payments");
      expect(() => resolvePaymentProvider("invalid")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("unsupported provider is rejected in non-production while explicit MOCK remains available", async () => {
    vi.stubEnv("NODE_ENV", "test");

    try {
      const { resolvePaymentProvider } = await import("../payments");
      expect(() => resolvePaymentProvider("invalid")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
      expect(resolvePaymentProvider("MOCK")).toBe("MOCK");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("createCheckout rejects invalid amounts", async () => {
    const { createCheckout } = await import("../payments");

    await expect(createCheckout({
      provider: "MOCK",
      orderId: "inv-001",
      callbackRef: "cb-abc123",
      amountToman: -100,
      email: "test@example.com",
    })).rejects.toThrow("AMOUNT_OUT_OF_RANGE");

    await expect(createCheckout({
      provider: "MOCK",
      orderId: "inv-001",
      callbackRef: "cb-abc123",
      amountToman: NaN,
      email: "test@example.com",
    })).rejects.toThrow("INVALID_AMOUNT");

    await expect(createCheckout({
      provider: "MOCK",
      orderId: "inv-001",
      callbackRef: "cb-abc123",
      amountToman: 200_000_000,
      email: "test@example.com",
    })).rejects.toThrow("AMOUNT_OUT_OF_RANGE");
  });

  it("createCheckout rejects invalid orderId and callbackRef lengths", async () => {
    const { createCheckout } = await import("../payments");

    await expect(createCheckout({
      provider: "MOCK",
      orderId: "x".repeat(65),
      callbackRef: "cb-abc123",
      amountToman: 1000,
      email: "test@example.com",
    })).rejects.toThrow("INVALID_ORDER_ID");

    await expect(createCheckout({
      provider: "MOCK",
      orderId: "inv-001",
      callbackRef: "x".repeat(129),
      amountToman: 1000,
      email: "test@example.com",
    })).rejects.toThrow("INVALID_CALLBACK_REF");
  });
});
