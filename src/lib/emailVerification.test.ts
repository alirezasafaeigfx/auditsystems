import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  emailVerificationToken: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "token-1", userId: "user-1", tokenHash: "hash", expiresAt: new Date(Date.now() + 86400000) }),
    update: vi.fn().mockResolvedValue({})
  },
  user: {
    update: vi.fn().mockResolvedValue({})
  },
  $transaction: vi.fn(async (fns: unknown) => {
    if (Array.isArray(fns)) {
      for (const item of fns) {
        if (item && typeof item === "object" && typeof (item as { then?: unknown }).then === "function") {
          await item;
        }
      }
    }
  })
};

vi.mock("./db", () => ({
  get prisma() {
    return mockPrisma;
  }
}));

describe("emailVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEmailVerificationToken", () => {
    it("returns a raw token string", async () => {
      const { createEmailVerificationToken } = await import("./emailVerification");
      const token = await createEmailVerificationToken("user-1");
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("deletes existing unused tokens first", async () => {
      const { createEmailVerificationToken } = await import("./emailVerification");
      await createEmailVerificationToken("user-1");
      expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalled();
    });

    it("creates a new token record", async () => {
      const { createEmailVerificationToken } = await import("./emailVerification");
      await createEmailVerificationToken("user-1");
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalled();
      const call = mockPrisma.emailVerificationToken.create.mock.calls[0][0];
      expect(call.data.userId).toBe("user-1");
      expect(typeof call.data.tokenHash).toBe("string");
      expect(call.data.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe("verifyEmailToken", () => {
    it("returns invalid for nonexistent token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValueOnce(null);
      const { verifyEmailToken } = await import("./emailVerification");
      const result = await verifyEmailToken("nonexistent-token");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("TOKEN_NOT_FOUND");
    });

    it("returns invalid for already used token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
        id: "t1", userId: "u1", tokenHash: "h", expiresAt: new Date(Date.now() + 86400000), usedAt: new Date()
      });
      const { verifyEmailToken } = await import("./emailVerification");
      const result = await verifyEmailToken("used-token");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("TOKEN_ALREADY_USED");
    });

    it("returns invalid for expired token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
        id: "t1", userId: "u1", tokenHash: "h", expiresAt: new Date(Date.now() - 1000), usedAt: null
      });
      const { verifyEmailToken } = await import("./emailVerification");
      const result = await verifyEmailToken("expired-token");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("TOKEN_EXPIRED");
    });

    it("marks token as used and verifies user email on valid token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
        id: "t1", userId: "u1", tokenHash: "h", expiresAt: new Date(Date.now() + 86400000), usedAt: null
      });
      const { verifyEmailToken } = await import("./emailVerification");
      const result = await verifyEmailToken("valid-token");
      expect(result.valid).toBe(true);
      expect(result.userId).toBe("u1");
      expect(mockPrisma.emailVerificationToken.update).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("deletes expired tokens", async () => {
      mockPrisma.emailVerificationToken.deleteMany.mockResolvedValueOnce({ count: 3 });
      const { cleanupExpiredTokens } = await import("./emailVerification");
      const count = await cleanupExpiredTokens();
      expect(count).toBe(3);
      expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalled();
    });
  });
});
