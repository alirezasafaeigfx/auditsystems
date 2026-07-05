import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUser = { id: "user-1", email: "test@example.com", name: "Test" };
const mockMembership = { userId: "user-1", organizationId: "org-1", organization: { id: "org-1", name: "Test Org" } };

vi.mock("./auth", () => ({
  validateSession: vi.fn().mockResolvedValue(mockUser),
  getOrganizationForUser: vi.fn().mockResolvedValue(mockMembership)
}));

describe("billing-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user and membership when authenticated", async () => {
    const { requireBillingAuth } = await import("./billing-auth");
    const result = await requireBillingAuth();
    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
    expect(result.membership).toEqual(mockMembership);
  });

  it("returns UNAUTHORIZED when not authenticated", async () => {
    const auth = await import("./auth");
    (auth.validateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const { requireBillingAuth } = await import("./billing-auth");
    const result = await requireBillingAuth();
    expect(result.error).toBe("UNAUTHORIZED");
  });

  it("returns NO_ORGANIZATION when no membership", async () => {
    const auth = await import("./auth");
    (auth.getOrganizationForUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const { requireBillingAuth } = await import("./billing-auth");
    const result = await requireBillingAuth();
    expect(result.error).toBe("NO_ORGANIZATION");
  });
});
