import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  verifyCheckout: vi.fn(),
  activateInvoice: vi.fn(),
  createSubscription: vi.fn(),
  csrfProtection: vi.fn(),
  logEvent: vi.fn()
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    invoice: {
      findFirst: mocks.findFirst,
      update: mocks.update
    },
    subscription: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("../../../../lib/payments", () => ({
  verifyCheckout: mocks.verifyCheckout
}));

vi.mock("../../../../lib/subscription", () => ({
  activateInvoice: mocks.activateInvoice,
  createSubscription: mocks.createSubscription
}));

vi.mock("../../../../lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection
}));

vi.mock("../../../../lib/observability", () => ({
  createRequestId: vi.fn(() => "req-1"),
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, _requestId: string, init?: ResponseInit) => Response.json(body, init)
}));

describe("GET /api/billing/callback provider policy", () => {
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
        `https://test/api/billing/callback?provider=${provider}&callbackRef=cb-1`
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("UNSUPPORTED_PROVIDER");
      expect(mocks.findFirst).not.toHaveBeenCalled();
      expect(mocks.verifyCheckout).not.toHaveBeenCalled();
      expect(mocks.activateInvoice).not.toHaveBeenCalled();
    }
  );
});
