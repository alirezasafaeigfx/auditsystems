import { PaymentProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckout, resolvePaymentProvider, verifyCheckout } from "./payments";

describe("payments", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.ZARINPAL_MERCHANT_ID;
    delete process.env.PAYMENT_PROVIDER_DEFAULT;
  });

  describe("resolvePaymentProvider", () => {
    it("resolves ZARINPAL provider", () => {
      expect(resolvePaymentProvider("zarinpal")).toBe("ZARINPAL");
      expect(resolvePaymentProvider("ZARINPAL")).toBe("ZARINPAL");
    });

    it("rejects unsupported providers", () => {
      expect(() => resolvePaymentProvider("idpay")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
      expect(() => resolvePaymentProvider("PAYPING")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
      expect(() => resolvePaymentProvider("unknown")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("uses MOCK only outside production", () => {
      expect(resolvePaymentProvider("MOCK")).toBe("MOCK");
      expect(resolvePaymentProvider(null)).toBe("MOCK");
    });

    it("requires an implemented provider in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(() => resolvePaymentProvider()).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
      expect(() => resolvePaymentProvider("MOCK")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
      expect(() => resolvePaymentProvider("IDPAY")).toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("accepts ZARINPAL as the production default", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("PAYMENT_PROVIDER_DEFAULT", "ZARINPAL");
      expect(resolvePaymentProvider()).toBe("ZARINPAL");
    });
  });

  describe("createCheckout", () => {
    it("creates MOCK checkout outside production", async () => {
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

    it("rejects MOCK checkout in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(
        createCheckout({
          provider: "MOCK",
          orderId: "order-123",
          callbackRef: "ref-456",
          amountToman: 100000,
          email: "test@example.com"
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
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

    it("rejects direct PAYPING and IDPAY checkout as unimplemented", async () => {
      for (const provider of ["PAYPING", "IDPAY"] as PaymentProvider[]) {
        await expect(
          createCheckout({
            provider,
            orderId: "order-123",
            callbackRef: "ref-456",
            amountToman: 100000,
            email: "test@example.com"
          })
        ).rejects.toThrow("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
      }
    });

    it("throws error for an unknown provider", async () => {
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
    it("verifies MOCK checkout outside production", async () => {
      const result = await verifyCheckout({
        provider: "MOCK",
        providerRef: "MOCK-order-123",
        amountToman: 100000,
        callbackStatus: "OK"
      });

      expect(result.paid).toBe(true);
      expect(result.providerRef).toBe("MOCK-order-123");
    });

    it("rejects MOCK verification in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(
        verifyCheckout({
          provider: "MOCK",
          providerRef: "MOCK-order-123",
          amountToman: 100000,
          callbackStatus: "OK"
        })
      ).rejects.toThrow("PAYMENT_PROVIDER_NOT_CONFIGURED");
    });

    it("returns false for a failed MOCK status", async () => {
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

    it("rejects direct PAYPING and IDPAY verification as unimplemented", async () => {
      for (const provider of ["PAYPING", "IDPAY"] as PaymentProvider[]) {
        await expect(
          verifyCheckout({
            provider,
            providerRef: "ref-123",
            amountToman: 100000
          })
        ).rejects.toThrow("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
      }
    });

    it("throws error for an unknown provider", async () => {
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
