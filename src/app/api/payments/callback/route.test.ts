import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  createEvent: vi.fn(),
  verifyCheckout: vi.fn(),
  logEvent: vi.fn(),
  observeApiRequest: vi.fn()
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    auditOrder: {
      findFirst: mocks.findFirst,
      update: mocks.update
    },
    auditOrderEvent: {
      create: mocks.createEvent
    }
  }
}));

vi.mock("../../../../lib/downloadToken", () => ({
  createDownloadToken: vi.fn(() => "download-token")
}));

vi.mock("../../../../lib/metrics", () => ({
  observeApiRequest: mocks.observeApiRequest
}));

vi.mock("../../../../lib/observability", () => ({
  createRequestId: vi.fn(() => "req-1"),
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, _requestId: string, init?: ResponseInit) => Response.json(body, init)
}));

vi.mock("../../../../lib/payments", () => ({
  verifyCheckout: mocks.verifyCheckout
}));

describe("GET /api/payments/callback provider policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["IDPAY", "PAYPING", "MOCK", "unknown"])(
    "rejects %s before database access",
    async (provider) => {
      const { GET } = await import("./route");
      const request = new NextRequest(
        `https://test/api/payments/callback?provider=${provider}&callbackRef=cb-1`
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("UNSUPPORTED_PROVIDER");
      expect(mocks.findFirst).not.toHaveBeenCalled();
      expect(mocks.verifyCheckout).not.toHaveBeenCalled();
    }
  );
});
