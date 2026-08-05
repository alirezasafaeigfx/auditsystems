import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleOrderCheckoutRequest: vi.fn(),
}));

vi.mock("../../../lib/order-checkout-handler", () => ({
  handleOrderCheckoutRequest: mocks.handleOrderCheckoutRequest,
}));

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.handleOrderCheckoutRequest.mockResolvedValue(new Response(null, { status: 202 }));
  });

  it("delegates the original request to the shared checkout policy", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("https://audit.test/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: "report-token",
        email: "buyer@example.com",
        provider: "MOCK",
        consentPrivacy: true,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(202);
    expect(mocks.handleOrderCheckoutRequest).toHaveBeenCalledWith(request, {
      metricPath: "/api/orders",
    });
  });
});
