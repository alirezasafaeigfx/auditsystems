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
  $transaction: vi.fn(async (fns: Array<() => Promise<unknown>>) => {
    for (const fn of fns) await fn();
  }),
  $disconnect: vi.fn()
};

vi.mock("./db", () => ({ prisma: mockPrisma }));

describe("subscription library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({ id: "sub-1", status: "ACTIVE" });
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
});
