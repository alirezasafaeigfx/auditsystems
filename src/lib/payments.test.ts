import { describe, expect, it, beforeEach } from "vitest";
import { createCheckout, verifyCheckout, resolvePaymentProvider } from "./payments";
import { PaymentProvider } from "@prisma/client";

describe("payments", () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.ZARINPAL_MERCHANT_ID;
    delete process.env.PAYPING_API_KEY;
    delete process.env.IDPAY_API_KEY;
    delete process.env.IDPAY_SANDBOX;
  });

  describe("resolvePaymentProvider", () => {
    it("resolves ZARINPAL provider", () => {
      expect(resolvePaymentProvider("zarinpal")).toBe("ZARINPAL");
      expect(resolvePaymentProvider("ZARINPAL")).toBe("ZARINPAL");
    });

    it("resolves IDPAY provider", () => {
      expect(resolvePaymentProvider("idpay")).toBe("IDPAY");
      expect(resolvePaymentProvider("IDPAY")).toBe("IDPAY");
    });

    it("resolves PAYPING provider", () => {
      expect(resolvePaymentProvider("payping")).toBe("PAYPING");
      expect(resolvePaymentProvider("PAYPING")).toBe("PAYPING");
    });

    it("resolves MOCK provider as default", () => {
      expect(resolvePaymentProvider("unknown")).toBe("MOCK");
      expect(resolvePaymentProvider(null)).toBe("MOCK");
    });
  });

  describe("createCheckout", () => {
    it("creates MOCK checkout successfully", async () => {
      const result = await createCheckout({
        provider: "MOCK",
        orderId: "order-123",
        callbackRef: "ref-456",
        amountToman: 100000,
        email: "test@example.com"
      });

      expect(result.redirectUrl).toContain("MOCK-order-123");
      expect(result.providerRef).toBe("MOCK-order-123");
      expect(result.callbackRef).toBe("ref-456");
    });

    it("throws error for ZARINPAL without merchant ID", async () => {
      await expect(
        createCheckout({
          provider: "ZARINPAL",
          orderId: "order-123",
          callbackRef: "ref-456",
          amountToman: 100000,
          email: "test@example.com"
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("throws error for PAYPING without API key", async () => {
      await expect(
        createCheckout({
          provider: "PAYPING",
          orderId: "order-123",
          callbackRef: "ref-456",
          amountToman: 100000,
          email: "test@example.com"
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("throws error for IDPAY without API key", async () => {
      await expect(
        createCheckout({
          provider: "IDPAY",
          orderId: "order-123",
          callbackRef: "ref-456",
          amountToman: 100000,
          email: "test@example.com"
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("throws error for unimplemented provider", async () => {
      await expect(
        createCheckout({
          provider: "UNKNOWN" as PaymentProvider,
          orderId: "order-123",
          callbackRef: "ref-456",
          amountToman: 100000,
          email: "test@example.com"
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
    });
  });

  describe("verifyCheckout", () => {
    it("verifies MOCK checkout successfully", async () => {
      const result = await verifyCheckout({
        provider: "MOCK",
        providerRef: "MOCK-order-123",
        amountToman: 100000,
        callbackStatus: "OK"
      });

      expect(result.paid).toBe(true);
      expect(result.providerRef).toBe("MOCK-order-123");
    });

    it("verifies MOCK checkout with failed status", async () => {
      const result = await verifyCheckout({
        provider: "MOCK",
        providerRef: "MOCK-order-123",
        amountToman: 100000,
        callbackStatus: "FAILED"
      });

      expect(result.paid).toBe(false);
    });

    it("throws error for ZARINPAL without merchant ID", async () => {
      await expect(
        verifyCheckout({
          provider: "ZARINPAL",
          providerRef: "auth-123",
          amountToman: 100000
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("throws error for PAYPING without API key", async () => {
      await expect(
        verifyCheckout({
          provider: "PAYPING",
          providerRef: "ref-123",
          amountToman: 100000
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("throws error for IDPAY without API key", async () => {
      await expect(
        verifyCheckout({
          provider: "IDPAY",
          providerRef: "id-123",
          amountToman: 100000
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("throws error for unimplemented provider", async () => {
      await expect(
        verifyCheckout({
          provider: "UNKNOWN" as PaymentProvider,
          providerRef: "ref-123",
          amountToman: 100000
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
    });
  });
});
