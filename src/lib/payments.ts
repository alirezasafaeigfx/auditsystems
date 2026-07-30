import { PaymentProvider } from "@prisma/client";
import { getAppBaseUrl } from "./site";

export type PaymentCheckoutResult = {
  redirectUrl: string;
  providerRef: string;
  callbackRef: string;
  raw?: unknown;
};

export type PaymentVerifyResult = {
  paid: boolean;
  providerRef?: string;
  raw?: unknown;
};

function getBaseUrl(): string {
  return getAppBaseUrl();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getDefaultProvider(): PaymentProvider {
  const value = process.env.PAYMENT_PROVIDER_DEFAULT?.trim().toUpperCase();
  if (value === "ZARINPAL") return "ZARINPAL";
  if (value === "MOCK" && !isProduction()) return "MOCK";
  if (!value && !isProduction()) return "MOCK";
  throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
}

export function resolvePaymentProvider(value?: string | null): PaymentProvider {
  if (!value) return getDefaultProvider();
  const upper = value.trim().toUpperCase();
  if (upper === "ZARINPAL") return "ZARINPAL";
  if (upper === "MOCK" && !isProduction()) return "MOCK";
  throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
}

export async function createCheckout(input: {
  provider: PaymentProvider;
  orderId: string;
  callbackRef: string;
  amountToman: number;
  email: string;
}): Promise<PaymentCheckoutResult> {
  if (typeof input.amountToman !== "number" || !Number.isFinite(input.amountToman)) {
    throw new Error("INVALID_AMOUNT");
  }
  if (input.amountToman <= 0 || input.amountToman > 100_000_000) {
    throw new Error("AMOUNT_OUT_OF_RANGE");
  }
  if (!input.orderId || input.orderId.length > 64) {
    throw new Error("INVALID_ORDER_ID");
  }
  if (!input.callbackRef || input.callbackRef.length > 128) {
    throw new Error("INVALID_CALLBACK_REF");
  }

  const callbackUrl = `${getBaseUrl()}/api/payments/callback?provider=${input.provider}&callbackRef=${encodeURIComponent(input.callbackRef)}`;
  const timeoutMs = 10_000;

  if (input.provider === "MOCK") {
    if (isProduction()) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    const redirectUrl = `${getBaseUrl()}/api/payments/callback?provider=MOCK&callbackRef=${encodeURIComponent(input.callbackRef)}&Status=OK&Authority=MOCK-${input.orderId}`;
    return {
      redirectUrl,
      providerRef: `MOCK-${input.orderId}`,
      callbackRef: input.callbackRef
    };
  }

  if (input.provider === "ZARINPAL") {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: input.amountToman * 10,
          callback_url: callbackUrl,
          description: `Audit order ${input.orderId}`,
          metadata: { email: input.email }
        })
      });

      if (!response.ok) throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);

      const body = (await response.json()) as { data?: { code?: number; authority?: string } };
      const code = body.data?.code;
      const authority = body.data?.authority;
      if (code !== 100 || !authority) throw new Error("PAYMENT_PROVIDER_REQUEST_FAILED");

      return {
        redirectUrl: `https://www.zarinpal.com/pg/StartPay/${authority}`,
        providerRef: authority,
        callbackRef: input.callbackRef,
        raw: body
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
}

export async function verifyCheckout(input: {
  provider: PaymentProvider;
  providerRef: string;
  amountToman: number;
  callbackStatus?: string | null;
}): Promise<PaymentVerifyResult> {
  const timeoutMs = 10_000;

  if (input.provider === "MOCK") {
    if (isProduction()) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    return {
      paid: (input.callbackStatus ?? "").toUpperCase() === "OK",
      providerRef: input.providerRef
    };
  }

  if (input.provider === "ZARINPAL") {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: input.amountToman * 10,
          authority: input.providerRef
        })
      });

      if (!response.ok) throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);

      const body = (await response.json()) as { data?: { code?: number; ref_id?: number } };
      const code = body.data?.code;
      return {
        paid: code === 100 || code === 101,
        providerRef: body.data?.ref_id ? String(body.data.ref_id) : input.providerRef,
        raw: body
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
}
