import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  auditRun: {
    count: vi.fn().mockResolvedValue(0),
  },
  project: {
    count: vi.fn().mockResolvedValue(0),
  },
  subscription: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
  plan: {
    findUnique: vi.fn().mockResolvedValue(null),
  },
};

vi.mock("../db", () => ({ prisma: mockPrisma }));

describe("usage enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canRunAudit", () => {
    it("allows audit when under limit", async () => {
      mockPrisma.auditRun.count.mockResolvedValueOnce(0);
      const { canRunAudit } = await import("../usage");
      const result = await canRunAudit("org-1");
      expect(result.allowed).toBe(true);
    });

    it("blocks audit when at limit", async () => {
      mockPrisma.auditRun.count.mockResolvedValueOnce(5);
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const { canRunAudit } = await import("../usage");
      const result = await canRunAudit("org-1");
      expect(result.allowed).toBe(false);
    });
  });

  describe("canCreateProject", () => {
    it("allows project when under limit", async () => {
      mockPrisma.project.count.mockResolvedValueOnce(0);
      const { canCreateProject } = await import("../usage");
      const result = await canCreateProject("org-1");
      expect(result.allowed).toBe(true);
    });

    it("blocks project when at limit", async () => {
      mockPrisma.project.count.mockResolvedValueOnce(3);
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const { canCreateProject } = await import("../usage");
      const result = await canCreateProject("org-1");
      expect(result.allowed).toBe(false);
    });
  });
});
