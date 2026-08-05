import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimPaymentVerification: vi.fn(),
  finalizePaymentVerification: vi.fn(),
  releasePaymentVerification: vi.fn(),
  verifyCheckout: vi.fn(),
  consumeDistributedRateLimit: vi.fn(),
  createDownloadToken: vi.fn(() => "download-token"),
  logEvent: vi.fn(),
  observeApiRequest: vi.fn(),
}));

vi.mock("../../../../lib/payment-callback-state", () => ({
  PaymentCallbackStateError: class PaymentCallbackStateError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
  claimPaymentVerification: mocks.claimPaymentVerification,
  finalizePaymentVerification: mocks.finalizePaymentVerification,
  releasePaymentVerification: mocks.releasePaymentVerification,
}));
vi.mock("../../../../lib/payments", () => ({ verifyCheckout: mocks.verifyCheckout }));
vi.mock("../../../../lib/rateLimit", () => ({ consumeDistributedRateLimit: mocks.consumeDistributedRateLimit }));
vi.mock("../../../../lib/downloadToken", () => ({ createDownloadToken: mocks.createDownloadToken }));
vi.mock("../../../../lib/metrics", () => ({ observeApiRequest: mocks.observeApiRequest }));
vi.mock("../../../../lib/observability", () => ({
  createRequestId: () => "request-callback-1",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    runId: "run-1",
    leadId: null,
    email: "buyer@example.com",
    amountToman: 290000,
    status: "PENDING",
    provider: "MOCK",
    providerRef: "MOCK-order-1",
    callbackRef: "callback-order-1",
    paidAt: null,
    createdAt: new Date("2026-08-05T12:00:00.000Z"),
    run: {
      locale: "fa",
      shares: [{ token: "report-share-token", createdAt: new Date("2026-08-05T12:00:00.000Z") }],
    },
    events: [],
    ...overrides,
  };
}

function callbackRequest(query = "provider=MOCK&callbackRef=callback-order-1&Status=OK&Authority=MOCK-order-1") {
  return new NextRequest(`https://audit.example.com/api/payments/callback?${query}`, {
    headers: { accept: "application/json" },
  });
}

describe("payment callback policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("IP_HASH_SALT", "callback-test-salt-minimum-32-characters");
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 29,
      limit: 30,
      resetSec: 900,
      backend: "local-redis",
    });
    mocks.releasePaymentVerification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["IDPAY", "PAYPING", "unknown"])(
    "rejects unsupported provider %s before rate limiting or claim",
    async (provider) => {
      const { GET } = await import("./route");
      const response = await GET(callbackRequest(`provider=${provider}&callbackRef=callback-order-1`));

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("UNSUPPORTED_PROVIDER");
      expect(mocks.consumeDistributedRateLimit).not.toHaveBeenCalled();
      expect(mocks.claimPaymentVerification).not.toHaveBeenCalled();
      expect(mocks.verifyCheckout).not.toHaveBeenCalled();
    },
  );

  it("rejects MOCK in production before claim", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());

    expect(response.status).toBe(400);
    expect(mocks.claimPaymentVerification).not.toHaveBeenCalled();
  });

  it("applies the distributed limiter before claiming verification", async () => {
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 30,
      resetSec: 120,
      backend: "local-redis",
    });
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(mocks.claimPaymentVerification).not.toHaveBeenCalled();
    expect(mocks.consumeDistributedRateLimit).toHaveBeenCalledWith({
      key: expect.stringMatching(/^payment-callback:[a-f0-9]{64}$/),
      limit: 30,
      windowSec: 900,
    });
  });

  it("returns not found without logging the raw callback reference", async () => {
    mocks.claimPaymentVerification.mockResolvedValue({ kind: "NOT_FOUND" });
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());

    expect(response.status).toBe(404);
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain("callback-order-1");
  });

  it("returns a bounded processing response without invoking the provider", async () => {
    mocks.claimPaymentVerification.mockResolvedValue({
      kind: "PROCESSING",
      order: order(),
      retryAfterSec: 60,
    });
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());

    expect(response.status).toBe(202);
    expect((await response.json()).status).toBe("VERIFYING");
    expect(mocks.verifyCheckout).not.toHaveBeenCalled();
  });

  it("releases the lease and rejects a provider reference mismatch", async () => {
    mocks.claimPaymentVerification.mockResolvedValue({
      kind: "CLAIMED",
      order: order(),
      leaseEventId: "lease-1",
    });
    const { GET } = await import("./route");
    const response = await GET(callbackRequest("provider=MOCK&callbackRef=callback-order-1&Status=OK&Authority=MOCK-other"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("PROVIDER_REF_MISMATCH");
    expect(mocks.releasePaymentVerification).toHaveBeenCalledWith({
      orderId: "order-1",
      leaseEventId: "lease-1",
      code: "PROVIDER_REF_MISMATCH",
    });
    expect(mocks.verifyCheckout).not.toHaveBeenCalled();
  });

  it("releases the lease when provider verification fails", async () => {
    mocks.claimPaymentVerification.mockResolvedValue({
      kind: "CLAIMED",
      order: order(),
      leaseEventId: "lease-1",
    });
    mocks.verifyCheckout.mockRejectedValue(new Error("PAYMENT_PROVIDER_TIMEOUT"));
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());

    expect(response.status).toBe(504);
    expect(mocks.releasePaymentVerification).toHaveBeenCalledWith({
      orderId: "order-1",
      leaseEventId: "lease-1",
      code: "PAYMENT_PROVIDER_TIMEOUT",
    });
    expect(mocks.finalizePaymentVerification).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain("callback-order-1");
  });

  it("finalizes a paid callback and returns a download URL", async () => {
    const pending = order();
    const paid = order({ status: "PAID", paidAt: new Date("2026-08-05T12:01:00.000Z") });
    mocks.claimPaymentVerification.mockResolvedValue({
      kind: "CLAIMED",
      order: pending,
      leaseEventId: "lease-1",
    });
    mocks.verifyCheckout.mockResolvedValue({ paid: true, providerRef: "MOCK-order-1" });
    mocks.finalizePaymentVerification.mockResolvedValue({ order: paid, reused: false });
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      orderId: "order-1",
      status: "PAID",
      downloadUrl: "/api/pdf/report-share-token?dl=download-token",
    });
    expect(mocks.finalizePaymentVerification).toHaveBeenCalledWith({
      orderId: "order-1",
      leaseEventId: "lease-1",
      paid: true,
      provider: "MOCK",
      providerRef: "MOCK-order-1",
      callbackStatus: "OK",
    });
  });

  it("reuses an already paid terminal result without another provider verification", async () => {
    mocks.claimPaymentVerification.mockResolvedValue({
      kind: "TERMINAL",
      order: order({ status: "PAID", paidAt: new Date() }),
    });
    const { GET } = await import("./route");
    const response = await GET(callbackRequest());

    expect(response.status).toBe(200);
    expect(mocks.verifyCheckout).not.toHaveBeenCalled();
    expect(mocks.finalizePaymentVerification).not.toHaveBeenCalled();
  });
});
