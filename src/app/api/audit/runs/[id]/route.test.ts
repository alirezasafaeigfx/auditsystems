import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  findUnique: vi.fn(),
  observeApiRequest: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("../../../../../lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
}));

vi.mock("../../../../../lib/db", () => ({
  prisma: {
    auditRun: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("../../../../../lib/metrics", () => ({
  observeApiRequest: mocks.observeApiRequest,
}));

vi.mock("../../../../../lib/observability", () => ({
  createRequestId: () => "test-request-id",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, _requestId: string, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    }),
}));

describe("GET /api/audit/runs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
  });

  it("rejects an unauthenticated caller before querying the run", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/audit/runs/run-1"),
      { params: Promise.resolve({ id: "run-1" }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: "UNAUTHORIZED", requestId: "test-request-id" }),
    );
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.observeApiRequest).toHaveBeenCalledWith(
      "/api/audit/runs/[id]",
      401,
      expect.any(Number),
    );
  });

  it("returns the selected status fields to an authenticated admin", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "run-1",
      status: "SUCCEEDED",
      startedAt: new Date("2026-07-12T10:00:00.000Z"),
      finishedAt: new Date("2026-07-12T10:01:00.000Z"),
      errorCode: null,
      errorMessage: null,
    });
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/audit/runs/run-1"),
      { params: Promise.resolve({ id: "run-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: "run-1", status: "SUCCEEDED" }),
    );
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "run-1" } }),
    );
  });

  it("returns 404 without leaking data for an unknown run", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/audit/runs/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: "NOT_FOUND", requestId: "test-request-id" }),
    );
  });
});
