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

function getDefaultProvider(): PaymentProvider {
  const value = (process.env.PAYMENT_PROVIDER_DEFAULT ?? "MOCK").toUpperCase();
  if (value === "ZARINPAL") return "ZARINPAL";
  if (value === "IDPAY") return "IDPAY";
  if (value === "PAYPING") return "PAYPING";
  return "MOCK";
}

export function resolvePaymentProvider(value?: string | null): PaymentProvider {
  if (!value) return getDefaultProvider();
  const upper = value.toUpperCase();
  if (upper === "ZARINPAL") return "ZARINPAL";
  if (upper === "IDPAY") return "IDPAY";
  if (upper === "PAYPING") return "PAYPING";
  return "MOCK";
}

export async function createCheckout(input: {
  provider: PaymentProvider;
  orderId: string;
  callbackRef: string;
  amountToman: number;
  email: string;
}): Promise<PaymentCheckoutResult> {
  const callbackUrl = `${getBaseUrl()}/api/payments/callback?provider=${input.provider}&callbackRef=${encodeURIComponent(input.callbackRef)}`;
  const timeoutMs = 10000; // 10 second timeout for all payment requests

  if (input.provider === "MOCK") {
    const redirectUrl = `${getBaseUrl()}/api/payments/callback?provider=MOCK&callbackRef=${encodeURIComponent(input.callbackRef)}&Status=OK&Authority=MOCK-${input.orderId}`;
    return {
      redirectUrl,
      providerRef: `MOCK-${input.orderId}`,
      callbackRef: input.callbackRef
    };
  }

  if (input.provider === "ZARINPAL") {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) {
      throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    }

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

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
      }

      const body = (await response.json()) as { data?: { code?: number; authority?: string } };
      const code = body.data?.code;
      const authority = body.data?.authority;

      if (code !== 100 || !authority) {
        throw new Error("PAYMENT_PROVIDER_REQUEST_FAILED");
      }

      return {
        redirectUrl: `https://www.zarinpal.com/pg/StartPay/${authority}`,
        providerRef: authority,
        callbackRef: input.callbackRef,
        raw: body
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    }
  }

  if (input.provider === "PAYPING") {
    // TODO: Verify PayPing API contract. This implementation is based on public documentation
    // and may need adjustment for production use.
    const apiKey = process.env.PAYPING_API_KEY;
    if (!apiKey) {
      throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.payping.ir/v1/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          amount: input.amountToman,
          payerIdentity: input.email,
          returnUrl: callbackUrl,
          clientRefId: input.orderId
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
      }

      const body = (await response.json()) as { code?: number; boardId?: string };
      const code = body.code;
      const boardId = body.boardId;

      if (code !== 200 || !boardId) {
        throw new Error("PAYMENT_PROVIDER_REQUEST_FAILED");
      }

      return {
        redirectUrl: `https://pay.ping.ir/v1/${boardId}`,
        providerRef: boardId,
        callbackRef: input.callbackRef,
        raw: body
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    }
  }

  if (input.provider === "IDPAY") {
    // TODO: Verify IdPay API contract. This implementation is based on public documentation
    // and may need adjustment for production use.
    const apiKey = process.env.IDPAY_API_KEY;
    if (!apiKey) {
      throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.idpay.ir/v1.1/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
          "X-SANDBOX": process.env.IDPAY_SANDBOX === "true" ? "1" : "0"
        },
        signal: controller.signal,
        body: JSON.stringify({
          order_id: input.orderId,
          amount: input.amountToman * 10,
          callback: callbackUrl,
          name: input.email.split("@")[0],
          mail: input.email
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
      }

      const body = (await response.json()) as { id?: string; link?: string };
      const id = body.id;
      const link = body.link;

      if (!id || !link) {
        throw new Error("PAYMENT_PROVIDER_REQUEST_FAILED");
      }

      return {
        redirectUrl: link,
        providerRef: id,
        callbackRef: input.callbackRef,
        raw: body
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
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
  const timeoutMs = 10000; // 10 second timeout for all payment requests

  if (input.provider === "MOCK") {
    return {
      paid: (input.callbackStatus ?? "").toUpperCase() === "OK",
      providerRef: input.providerRef
    };
  }

  if (input.provider === "ZARINPAL") {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) {
      throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    }

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

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
      }

      const body = (await response.json()) as { data?: { code?: number; ref_id?: number } };
      const code = body.data?.code;

      return {
        paid: code === 100 || code === 101,
        providerRef: body.data?.ref_id ? String(body.data.ref_id) : input.providerRef,
        raw: body
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    }
  }

  if (input.provider === "PAYPING") {
    // TODO: Verify PayPing verify API contract. This implementation is based on public documentation
    // and may need adjustment for production use.
    const apiKey = process.env.PAYPING_API_KEY;
    if (!apiKey) {
      throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.payping.ir/v1/pay/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          refId: input.providerRef,
          amount: input.amountToman
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
      }

      const body = (await response.json()) as { cardNumberPan?: string; cardHashPan?: string };
      const paid = !!(body.cardNumberPan || body.cardHashPan);

      return {
        paid,
        providerRef: input.providerRef,
        raw: body
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    }
  }

  if (input.provider === "IDPAY") {
    // TODO: Verify IdPay verify API contract. This implementation is based on public documentation
    // and may need adjustment for production use.
    const apiKey = process.env.IDPAY_API_KEY;
    if (!apiKey) {
      throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`https://api.idpay.ir/v1.1/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
          "X-SANDBOX": process.env.IDPAY_SANDBOX === "true" ? "1" : "0"
        },
        signal: controller.signal,
        body: JSON.stringify({
          id: input.providerRef,
          order_id: input.providerRef // Using providerRef as order_id
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
      }

      const body = (await response.json()) as { status?: number; payment?: { track_id?: string } };
      const paid = body.status === 100;

      return {
        paid,
        providerRef: body.payment?.track_id || input.providerRef,
        raw: body
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("PAYMENT_PROVIDER_TIMEOUT");
      }
      throw error;
    }
  }

  throw new Error("PAYMENT_PROVIDER_NOT_IMPLEMENTED");
}
