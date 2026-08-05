import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  csrfProtection: vi.fn(),
  reportShareFindUnique: vi.fn(),
  prepareOrderCheckout: vi.fn(),
  markOrderCheckoutProviderRequestStarted: vi.fn(),
  completeOrderCheckout: vi.fn(),
  failOrderCheckout: vi.fn(),
  createCheckout: vi.fn(),
  resolvePaymentProvider: vi.fn(),
  consumeDistributedRateLimit: vi.fn(),
  isReportShareAccessible: vi.fn(() => true),
  createDownloadToken: vi.fn(() => "download-token"),
  observeApiRequest: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("./csrf", () => ({ csrfProtection: mocks.csrfProtection }));
vi.mock("./db", () => ({
  prisma: {
    reportShare: { findUnique: mocks.reportShareFindUnique },
  },
}));
vi.mock("./order-checkout", () => ({
  OrderCheckoutError: class OrderCheckoutError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
  prepareOrderCheckout: mocks.prepareOrderCheckout,
  markOrderCheckoutProviderRequestStarted: mocks.markOrderCheckoutProviderRequestStarted,
  completeOrderCheckout: mocks.completeOrderCheckout,
  failOrderCheckout: mocks.failOrderCheckout,
}));
vi.mock("./payments", () => ({
  createCheckout: mocks.createCheckout,
  resolvePaymentProvider: mocks.resolvePaymentProvider,
}));
vi.mock("./rateLimit", () => ({ consumeDistributedRateLimit: mocks.consumeDistributedRateLimit }));
vi.mock("./reportShare", () => ({ isReportShareAccessible: mocks.isReportShareAccessible }));
vi.mock("./downloadToken", () => ({ createDownloadToken: mocks.createDownloadToken }));
vi.mock("./metrics", () => ({ observeApiRequest: mocks.observeApiRequest }));
vi.mock("./observability", () => ({
  createRequestId: () => "request-order-1",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://audit.example.com/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function validPayload() {
  return {
    token: "sensitive-report-token",
    email: "buyer@example.com",
    provider: "MOCK",
    consentPrivacy: true,
  };
}

function claimedOrder() {
  return {
    kind: "CLAIMED" as const,
    order: { id: "order-1", amountToman: 290000, status: "PENDING" },
    callbackRef: "callback-1",
    reused: false as const,
  };
}

function share() {
  return {
    id: "share-1",
    runId: "run-1",
    token: "sensitive-report-token",
    expiresAt: null,
    revokedAt: null,
    run: {
      status: "SUCCEEDED",
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
    },
  };
}

describe("order checkout request handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.IP_HASH_SALT = "test-order-handler-salt-minimum-32";
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.resolvePaymentProvider.mockReturnValue("MOCK");
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 7,
      limit: 8,
      resetSec: 900,
      backend: "local-redis",
    });
    mocks.reportShareFindUnique.mockResolvedValue(share());
    mocks.markOrderCheckoutProviderRequestStarted.mockResolvedValue(undefined);
    mocks.failOrderCheckout.mockResolvedValue(undefined);
  });

  it("does not expose CSRF diagnostics", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "secret-csrf-diagnostic" });
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request({}), { metricPath: "/api/orders" });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "FORBIDDEN", requestId: "request-order-1" });
    expect(JSON.stringify(body)).not.toContain("secret-csrf-diagnostic");
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain("secret-csrf-diagnostic");
  });

  it("enforces the distributed limiter before reading the report", async () => {
    mocks.consumeDistributedRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 8,
      resetSec: 180,
      backend: "local-redis",
    });
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("180");
    expect(mocks.reportShareFindUnique).not.toHaveBeenCalled();
    expect(mocks.consumeDistributedRateLimit).toHaveBeenCalledWith({
      key: expect.stringMatching(/^order-checkout:[a-f0-9]{64}$/),
      limit: 8,
      windowSec: 900,
    });
  });

  it("logs only a digest when a report token is not found", async () => {
    mocks.reportShareFindUnique.mockResolvedValue(null);
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(404);
    const serialized = JSON.stringify(mocks.logEvent.mock.calls);
    expect(serialized).not.toContain("sensitive-report-token");
    expect(mocks.logEvent).toHaveBeenCalledWith(
      "warn",
      "order_report_not_found",
      expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );
  });

  it("returns an initializing response without calling the payment provider", async () => {
    mocks.prepareOrderCheckout.mockResolvedValue({
      kind: "INITIALIZING",
      order: { id: "order-1" },
      retryAfterSec: 3,
    });
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(202);
    expect(response.headers.get("retry-after")).toBe("3");
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("persists the provider-request marker before contacting the provider", async () => {
    const order = claimedOrder().order;
    mocks.prepareOrderCheckout.mockResolvedValue(claimedOrder());
    mocks.createCheckout.mockResolvedValue({
      providerRef: "provider-ref-1",
      callbackRef: "callback-1",
      redirectUrl: "https://payment.example.com/start/1",
    });
    mocks.completeOrderCheckout.mockResolvedValue({
      order,
      redirectUrl: "https://payment.example.com/start/1",
      reused: false,
    });
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(200);
    expect(mocks.markOrderCheckoutProviderRequestStarted).toHaveBeenCalledWith({
      orderId: "order-1",
      callbackRef: "callback-1",
      provider: "MOCK",
    });
    expect(mocks.markOrderCheckoutProviderRequestStarted.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.createCheckout.mock.invocationCallOrder[0]);
  });

  it("finalizes a claimed checkout once and returns its redirect", async () => {
    const order = claimedOrder().order;
    mocks.prepareOrderCheckout.mockResolvedValue(claimedOrder());
    mocks.createCheckout.mockResolvedValue({
      providerRef: "provider-ref-1",
      callbackRef: "callback-1",
      redirectUrl: "https://payment.example.com/start/1",
    });
    mocks.completeOrderCheckout.mockResolvedValue({
      order,
      redirectUrl: "https://payment.example.com/start/1",
      reused: false,
    });
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      orderId: "order-1",
      redirectUrl: "https://payment.example.com/start/1",
      reused: false,
    });
    expect(mocks.completeOrderCheckout).toHaveBeenCalledWith({
      orderId: "order-1",
      callbackRef: "callback-1",
      providerRef: "provider-ref-1",
      redirectUrl: "https://payment.example.com/start/1",
      provider: "MOCK",
    });
  });

  it("quarantines a provider timeout after the external request marker", async () => {
    mocks.prepareOrderCheckout.mockResolvedValue(claimedOrder());
    mocks.createCheckout.mockRejectedValue(new Error("PAYMENT_PROVIDER_TIMEOUT"));
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "CHECKOUT_RECONCILIATION_REQUIRED",
      requestId: "request-order-1",
    });
    expect(mocks.failOrderCheckout).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain("sensitive-report-token");
  });

  it("fails a checkout for a definitive provider rejection", async () => {
    mocks.prepareOrderCheckout.mockResolvedValue(claimedOrder());
    mocks.createCheckout.mockRejectedValue(new Error("PAYMENT_PROVIDER_HTTP_400"));
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(502);
    expect(mocks.failOrderCheckout).toHaveBeenCalledWith({
      orderId: "order-1",
      callbackRef: "callback-1",
      code: "PAYMENT_PROVIDER_HTTP_400",
    });
  });

  it("quarantines a post-provider persistence failure", async () => {
    mocks.prepareOrderCheckout.mockResolvedValue(claimedOrder());
    mocks.createCheckout.mockResolvedValue({
      providerRef: "provider-ref-1",
      callbackRef: "callback-1",
      redirectUrl: "https://payment.example.com/start/1",
    });
    mocks.completeOrderCheckout.mockRejectedValue(new Error("CHECKOUT_PERSISTENCE_FAILED"));
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request(validPayload()), { metricPath: "/api/orders" });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "CHECKOUT_RECONCILIATION_REQUIRED",
      requestId: "request-order-1",
    });
    expect(mocks.failOrderCheckout).not.toHaveBeenCalled();
  });

  it("uses the path token override for the legacy endpoint", async () => {
    mocks.prepareOrderCheckout.mockResolvedValue({
      kind: "READY",
      order: { id: "order-legacy", status: "PENDING" },
      redirectUrl: "https://payment.example.com/start/legacy",
      reused: true,
    });
    const { handleOrderCheckoutRequest } = await import("./order-checkout-handler");

    const response = await handleOrderCheckoutRequest(request({
      email: "buyer@example.com",
      provider: "MOCK",
      consentPrivacy: true,
    }), {
      metricPath: "/api/reports/[token]/unlock",
      tokenOverride: "legacy-path-token",
    });

    expect(response.status).toBe(200);
    expect(mocks.reportShareFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: "legacy-path-token" },
    }));
  });
});
