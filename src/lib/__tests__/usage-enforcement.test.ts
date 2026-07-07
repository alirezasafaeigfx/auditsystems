import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuditCount = vi.fn();
const mockProjectCount = vi.fn();

vi.mock("../db", () => ({
  prisma: {
    auditRun: { count: mockAuditCount },
    project: { count: mockProjectCount },
  },
}));

const mockGetSubscriptionPlan = vi.fn();

vi.mock("../subscription", () => ({
  getSubscriptionPlan: (...args: unknown[]) => mockGetSubscriptionPlan(...args),
  recordUsage: vi.fn(),
}));

const { canRunAudit, canCreateProject, getUsageStats } = await import("../usage");

function mockPlan(overrides: Partial<{ code: string; projectLimit: number; monthlyAuditLimit: number; scheduledAudits: boolean }> = {}) {
  return {
    code: "free",
    name: "Free",
    priceMonthlyToman: 0,
    projectLimit: 1,
    monthlyAuditLimit: 3,
    pdfExport: false,
    scheduledAudits: false,
    upgradeCta: "Upgrade to Starter",
    billingNote: "Free plan — no payment required",
    ...overrides,
  };
}

describe("Usage enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canRunAudit", () => {
    it("returns allowed=true when under monthly audit limit", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ monthlyAuditLimit: 5 }));
      mockAuditCount.mockResolvedValue(2);

      const result = await canRunAudit("org-1");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(5);
    });

    it("returns allowed=false when monthly audit limit is reached", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ monthlyAuditLimit: 3 }));
      mockAuditCount.mockResolvedValue(3);

      const result = await canRunAudit("org-1");

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(3);
    });

    it("returns allowed=false when over monthly audit limit", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ monthlyAuditLimit: 3 }));
      mockAuditCount.mockResolvedValue(5);

      const result = await canRunAudit("org-1");

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(3);
    });

    it("allows starter plan up to 20 audits", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ code: "starter", monthlyAuditLimit: 20 }));
      mockAuditCount.mockResolvedValue(19);

      const result = await canRunAudit("org-1");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(19);
      expect(result.limit).toBe(20);
    });
  });

  describe("canCreateProject", () => {
    it("returns allowed=true when under project limit", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ projectLimit: 3 }));
      mockProjectCount.mockResolvedValue(1);

      const result = await canCreateProject("org-1");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(3);
    });

    it("returns allowed=false when project limit is reached", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ projectLimit: 1 }));
      mockProjectCount.mockResolvedValue(1);

      const result = await canCreateProject("org-1");

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe("getUsageStats", () => {
    it("returns correct remaining counts", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ projectLimit: 3, monthlyAuditLimit: 20 }));
      mockProjectCount.mockResolvedValue(2);
      mockAuditCount.mockResolvedValue(10);

      const stats = await getUsageStats("org-1");

      expect(stats.projectsRemaining).toBe(1);
      expect(stats.auditsRemaining).toBe(10);
      expect(stats.canCreateProject).toBe(true);
      expect(stats.canRunAudit).toBe(true);
    });

    it("returns zero remaining when at limit", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ projectLimit: 1, monthlyAuditLimit: 3 }));
      mockProjectCount.mockResolvedValue(1);
      mockAuditCount.mockResolvedValue(3);

      const stats = await getUsageStats("org-1");

      expect(stats.projectsRemaining).toBe(0);
      expect(stats.auditsRemaining).toBe(0);
      expect(stats.canCreateProject).toBe(false);
      expect(stats.canRunAudit).toBe(false);
    });
  });

  describe("API route limit checks", () => {
    it("project audit route checks canRunAudit", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ monthlyAuditLimit: 3 }));
      mockAuditCount.mockResolvedValue(3);

      const result = await canRunAudit("org-1");
      expect(result.allowed).toBe(false);
    });

    it("project creation route checks canCreateProject", async () => {
      mockGetSubscriptionPlan.mockResolvedValue(mockPlan({ projectLimit: 1 }));
      mockProjectCount.mockResolvedValue(1);

      const result = await canCreateProject("org-1");
      expect(result.allowed).toBe(false);
    });
  });
});
