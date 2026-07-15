import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  getBillingEvents: vi.fn(),
}));

vi.mock("../../../../lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
}));

vi.mock("../../../../lib/billing-events", () => ({
  getBillingEvents: mocks.getBillingEvents,
}));

vi.mock("../../../../lib/observability", () => ({
  createRequestId: () => "test-req-id",
  logEvent: vi.fn(),
  respondJson: (body: unknown, _id: string, init?: ResponseInit) =>
    new Response(JSON.stringify(body), { status: init?.status ?? 200, headers: { "content-type": "application/json" } }),
}));

describe("GET /api/admin/billing-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.getBillingEvents.mockResolvedValue({ events: [], total: 0 });
  });

  it("returns 401 when admin session is invalid", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const req = new NextRequest("http://localhost/api/admin/billing-events?organizationId=org1");
    const { GET } = await import("./route");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/billing-events");
    const { GET } = await import("./route");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns billing events for requested organizationId", async () => {
    mocks.getBillingEvents.mockResolvedValue({
      events: [{ id: "e1", type: "AUDIT_PURCHASED" }],
      total: 1,
    });
    const req = new NextRequest("http://localhost/api/admin/billing-events?organizationId=org1");
    const { GET } = await import("./route");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(mocks.getBillingEvents).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org1" })
    );
  });

  it("passes filter params through to getBillingEvents", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/billing-events?organizationId=org1&eventType=AUDIT_PURCHASED&limit=10&offset=5"
    );
    const { GET } = await import("./route");
    await GET(req);
    expect(mocks.getBillingEvents).toHaveBeenCalledWith({
      organizationId: "org1",
      eventType: "AUDIT_PURCHASED",
      limit: 10,
      offset: 5,
    });
  });
});
