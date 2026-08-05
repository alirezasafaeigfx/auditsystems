import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildReadinessReport: vi.fn(),
  createRequestId: vi.fn(() => "request-ready-1"),
  logEvent: vi.fn(),
}));

vi.mock("../../../lib/health", () => ({
  buildReadinessReport: mocks.buildReadinessReport,
}));

vi.mock("../../../lib/observability", () => ({
  createRequestId: mocks.createRequestId,
  logEvent: mocks.logEvent,
}));

describe("GET /api/ready", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns only coarse public checks when ready", async () => {
    mocks.buildReadinessReport.mockResolvedValue({
      ok: true,
      service: "asdev-audit-ir",
      timestamp: "2026-07-31T14:00:00.000Z",
      checks: [
        { name: "database", status: "pass", latencyMs: 17, detail: "PostgreSQL query succeeded" },
        { name: "redis", status: "skip", latencyMs: 1, detail: "Redis backend is not configured" },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "ready",
      ok: true,
      service: "auditsystems",
      requestId: "request-ready-1",
      checks: [
        { name: "database", status: "pass" },
        { name: "redis", status: "skip" },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("PostgreSQL");
    expect(JSON.stringify(body)).not.toContain("latencyMs");
    expect(mocks.logEvent).not.toHaveBeenCalled();
  });

  it("logs private failure details but returns a redacted degraded response", async () => {
    mocks.buildReadinessReport.mockResolvedValue({
      ok: false,
      service: "asdev-audit-ir",
      timestamp: "2026-07-31T14:00:00.000Z",
      checks: [
        {
          name: "database",
          status: "fail",
          latencyMs: 1502,
          detail: "Database not ready (password authentication failed for user private_user)",
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.ok).toBe(false);
    expect(body.checks).toEqual([{ name: "database", status: "fail" }]);
    expect(JSON.stringify(body)).not.toContain("private_user");
    expect(JSON.stringify(body)).not.toContain("password authentication failed");
    expect(mocks.logEvent).toHaveBeenCalledWith(
      "error",
      "readiness_degraded",
      expect.objectContaining({
        requestId: "request-ready-1",
        checks: [
          expect.objectContaining({
            name: "database",
            status: "fail",
            latencyMs: 1502,
            detail: expect.stringContaining("private_user"),
          }),
        ],
      }),
    );
  });

  it("preserves status and cache headers for HEAD without a response body", async () => {
    mocks.buildReadinessReport.mockResolvedValue({
      ok: false,
      service: "asdev-audit-ir",
      timestamp: "2026-07-31T14:00:00.000Z",
      checks: [{ name: "database", status: "fail", latencyMs: 1, detail: "private detail" }],
    });

    const { HEAD } = await import("./route");
    const response = await HEAD();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });
});
