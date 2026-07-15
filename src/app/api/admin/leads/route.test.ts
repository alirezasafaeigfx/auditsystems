import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    auditLead: {
      findMany: mocks.findMany,
      count: mocks.count,
    },
  },
}));

describe("GET /api/admin/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
  });

  it("rejects an unauthenticated request before reading lead data", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const { GET } = await import("./route");

    const response = await GET(new NextRequest("http://localhost/api/admin/leads"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("returns bounded pagination and status counts for an authenticated admin", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "lead-1",
        email: "lead@example.com",
        status: "NEW",
        run: null,
        orders: [],
      },
    ]);
    mocks.count
      .mockResolvedValueOnce(1)
      .mockResolvedValue(0);
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/admin/leads?page=1&limit=500"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.leads).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.limit).toBe(100);
    expect(Array.isArray(body.statusCounts)).toBe(true);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });

  it("returns a generic 500 response without leaking internal errors", async () => {
    mocks.validateAdminSession.mockRejectedValue(
      new Error("database password and internal stack must not leak"),
    );
    const { GET } = await import("./route");

    const response = await GET(new NextRequest("http://localhost/api/admin/leads"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Failed to fetch leads" });
    expect(JSON.stringify(body)).not.toContain("database password");
    expect(JSON.stringify(body)).not.toContain("stack");
  });
});
