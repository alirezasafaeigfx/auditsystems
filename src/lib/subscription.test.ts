import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  subscription: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "sub-1", status: "ACTIVE" }),
    update: vi.fn().mockResolvedValue({ id: "sub-1", status: "CANCELED" }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  },
  plan: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    upsert: vi.fn()
  },
  usageLedger: {
    create: vi.fn().mockResolvedValue({ id: "ul-1" }),
    aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  },
  invoice: {
    create: vi.fn().mockResolvedValue({ id: "inv-1", status: "PENDING" }),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({ id: "inv-1", status: "PAID" })
  },
  billingEvent: {
    create: vi.fn().mockResolvedValue({ id: "be-1" }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0)
  },
  $transaction: vi.fn(async (fns: Array<() => Promise<unknown>>) => {
    for (const fn of fns) await fn();
  }),
  $disconnect: vi.fn()
};

vi.mock("./db", () => ({ prisma: mockPrisma }));

describe("subscription library", () => {
  beforeEach(() => {
    mockPrisma.subscription.findFirst.mockReset();
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.subscription.create.mockReset();
    mockPrisma.subscription.create.mockResolvedValue({ id: "sub-1", status: "ACTIVE" });
    mockPrisma.subscription.update.mockReset();
    mockPrisma.subscription.update.mockResolvedValue({ id: "sub-1", status: "CANCELED" });
    mockPrisma.subscription.deleteMany.mockReset();
    mockPrisma.subscription.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.plan.findUnique.mockReset();
    mockPrisma.plan.findUnique.mockResolvedValue(null);
    mockPrisma.plan.findMany.mockReset();
    mockPrisma.plan.findMany.mockResolvedValue([]);
    mockPrisma.plan.upsert.mockReset();
    mockPrisma.usageLedger.create.mockReset();
    mockPrisma.usageLedger.create.mockResolvedValue({ id: "ul-1" });
    mockPrisma.usageLedger.aggregate.mockReset();
    mockPrisma.usageLedger.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
    mockPrisma.usageLedger.deleteMany.mockReset();
    mockPrisma.usageLedger.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.invoice.create.mockReset();
    mockPrisma.invoice.create.mockResolvedValue({ id: "inv-1", status: "PENDING" });
    mockPrisma.invoice.findMany.mockReset();
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    mockPrisma.invoice.findFirst.mockReset();
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.update.mockReset();
    mockPrisma.invoice.update.mockResolvedValue({ id: "inv-1", status: "PAID" });
    mockPrisma.billingEvent.create.mockReset();
    mockPrisma.billingEvent.create.mockResolvedValue({ id: "be-1" });
    mockPrisma.billingEvent.findMany.mockReset();
    mockPrisma.billingEvent.findMany.mockResolvedValue([]);
    mockPrisma.billingEvent.count.mockReset();
    mockPrisma.billingEvent.count.mockResolvedValue(0);
  });

  describe("getActiveSubscription", () => {
    it("returns null when no subscription exists", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const { getActiveSubscription } = await import("./subscription");
      const result = await getActiveSubscription("org-1");
      expect(result).toBeNull();
    });
  });

  describe("createSubscription", () => {
    it("creates subscription with correct plan", async () => {
      mockPrisma.plan.findUnique.mockResolvedValueOnce({ id: "plan-1", code: "starter" });
      const { createSubscription } = await import("./subscription");
      const result = await createSubscription({ organizationId: "org-1", planCode: "starter" });
      expect(result.status).toBe("ACTIVE");
      expect(mockPrisma.subscription.create).toHaveBeenCalled();
    });

    it("throws for nonexistent plan", async () => {
      mockPrisma.plan.findUnique.mockResolvedValueOnce(null);
      const { createSubscription } = await import("./subscription");
      await expect(createSubscription({ organizationId: "org-1", planCode: "nonexistent" as "free" }))
        .rejects.toThrow("PLAN_NOT_FOUND");
    });
  });

  describe("recordUsage", () => {
    it("creates usage ledger entry", async () => {
      const { recordUsage } = await import("./subscription");
      await recordUsage({ organizationId: "org-1", type: "AUDIT_RUN" });
      expect(mockPrisma.usageLedger.create).toHaveBeenCalled();
      const call = mockPrisma.usageLedger.create.mock.calls[0][0];
      expect(call.data.organizationId).toBe("org-1");
      expect(call.data.type).toBe("AUDIT_RUN");
      expect(call.data.quantity).toBe(1);
    });
  });

  describe("getMonthlyUsage", () => {
    it("returns 0 when no usage exists", async () => {
      mockPrisma.usageLedger.aggregate.mockResolvedValueOnce({ _sum: { quantity: null } });
      const { getMonthlyUsage } = await import("./subscription");
      const result = await getMonthlyUsage("org-1", "AUDIT_RUN");
      expect(result).toBe(0);
    });

    it("returns aggregated quantity", async () => {
      mockPrisma.usageLedger.aggregate.mockResolvedValueOnce({ _sum: { quantity: 15 } });
      const { getMonthlyUsage } = await import("./subscription");
      const result = await getMonthlyUsage("org-1", "AUDIT_RUN");
      expect(result).toBe(15);
    });
  });

  describe("createInvoice", () => {
    it("creates invoice with PENDING status", async () => {
      const { createInvoice } = await import("./subscription");
      const result = await createInvoice({
        organizationId: "org-1",
        planId: "plan-1",
        amountToman: 290000
      });
      expect(result.status).toBe("PENDING");
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
    });
  });

  describe("activateInvoice", () => {
    it("marks invoice as PAID", async () => {
      const { activateInvoice } = await import("./subscription");
      const result = await activateInvoice("inv-1");
      expect(result.status).toBe("PAID");
    });
  });

  describe("cancelSubscription", () => {
    it("cancels active subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({ id: "sub-1", status: "ACTIVE", plan: { code: "starter" }, planId: "plan-1" });
      const { cancelSubscription } = await import("./subscription");
      const result = await cancelSubscription("org-1");
      expect(result).not.toBeNull();
    });

    it("returns null when no active subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const { cancelSubscription } = await import("./subscription");
      const result = await cancelSubscription("org-1");
      expect(result).toBeNull();
    });
  });

  describe("upgradeSubscription", () => {
    it("cancels current and creates new subscription", async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce({ id: "sub-1", status: "ACTIVE", plan: { code: "starter" }, planId: "plan-1" })
        .mockResolvedValueOnce({ id: "sub-2", status: "ACTIVE", plan: { code: "pro" }, planId: "plan-2" });
      mockPrisma.plan.findUnique.mockResolvedValue({ id: "plan-2", code: "pro" });
      mockPrisma.subscription.update.mockResolvedValueOnce({ id: "sub-1", status: "CANCELED" });
      mockPrisma.subscription.create.mockResolvedValueOnce({ id: "sub-2", status: "ACTIVE" });
      const { upgradeSubscription } = await import("./subscription");
      const result = await upgradeSubscription("org-1", "pro");
      expect(result.status).toBe("ACTIVE");
    });
  });

  describe("reactivateSubscription", () => {
    it("reactivates canceled subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({ id: "sub-1", status: "CANCELED", planId: "plan-1" });
      mockPrisma.plan.findUnique.mockResolvedValueOnce({ id: "plan-1", code: "starter" });
      const { reactivateSubscription } = await import("./subscription");
      const result = await reactivateSubscription("org-1");
      expect(result).not.toBeNull();
    });

    it("returns null when no canceled subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const { reactivateSubscription } = await import("./subscription");
      const result = await reactivateSubscription("org-1");
      expect(result).toBeNull();
    });
  });
});
