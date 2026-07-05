import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  session: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  },
  job: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  },
  emailVerificationToken: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  },
  usageLedger: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  }
};

vi.mock("./db", () => ({ prisma: mockPrisma }));

describe("cleanup helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cleanupExpiredSessions deletes old sessions", async () => {
    const { cleanupExpiredSessions } = await import("./cleanup");
    mockPrisma.session.deleteMany.mockResolvedValueOnce({ count: 5 });
    const count = await cleanupExpiredSessions();
    expect(count).toBe(5);
    expect(mockPrisma.session.deleteMany).toHaveBeenCalled();
  });

  it("cleanupStaleJobs deletes finished jobs", async () => {
    const { cleanupStaleJobs } = await import("./cleanup");
    mockPrisma.job.deleteMany.mockResolvedValueOnce({ count: 3 });
    const count = await cleanupStaleJobs();
    expect(count).toBe(3);
    expect(mockPrisma.job.deleteMany).toHaveBeenCalled();
  });

  it("cleanupExpiredTokens deletes expired verification tokens", async () => {
    const { cleanupExpiredTokens } = await import("./cleanup");
    mockPrisma.emailVerificationToken.deleteMany.mockResolvedValueOnce({ count: 2 });
    const count = await cleanupExpiredTokens();
    expect(count).toBe(2);
    expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } }
    });
  });

  it("cleanupOldUsageLedger deletes old entries", async () => {
    const { cleanupOldUsageLedger } = await import("./cleanup");
    mockPrisma.usageLedger.deleteMany.mockResolvedValueOnce({ count: 10 });
    const count = await cleanupOldUsageLedger();
    expect(count).toBe(10);
    expect(mockPrisma.usageLedger.deleteMany).toHaveBeenCalled();
  });
});
