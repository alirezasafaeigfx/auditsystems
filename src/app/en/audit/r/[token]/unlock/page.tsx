"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackSeoEvent } from "../../../../../../lib/analytics";
import { fetchCSRFHeaders } from "../../../../../../lib/csrf-client";

const allowMockProvider = process.env.NODE_ENV !== "production";
const INITIALIZING_RETRIES = 3;

export default function UnlockPageEn() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"MOCK" | "ZARINPAL">(
    allowMockProvider ? "MOCK" : "ZARINPAL",
  );
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackSeoEvent("seo_unlock_page_view", { locale: "en", path: `/en/audit/r/${token}/unlock` });
  }, [token]);

  function toUserMessage(errorCode: string): string {
    if (errorCode === "INVALID_EMAIL") return "Please enter a valid email address.";
    if (errorCode === "CONSENT_REQUIRED") return "Consent is required to create and follow up this order.";
    if (errorCode === "NOT_FOUND") return "Report not found or unavailable.";
    if (errorCode === "REPORT_NOT_READY") return "Report is not ready yet.";
    if (errorCode === "RATE_LIMITED") return "Too many checkout attempts. Please try again later.";
    if (errorCode === "PAYMENT_PROVIDER_UNAVAILABLE") return "The payment provider is currently unavailable.";
    if (errorCode === "PAYMENT_PROVIDER_TIMEOUT") return "The payment provider timed out. Please try again.";
    if (errorCode === "CHECKOUT_RETRY_REQUIRED") return "The order state changed. Please try again.";
    return "Failed to create order. Please try again.";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    trackSeoEvent("seo_unlock_started", { locale: "en", provider });
    setIsSubmitting(true);
    setMessage("");

    try {
      const csrf = await fetchCSRFHeaders();
      for (let attempt = 0; attempt < INITIALIZING_RETRIES; attempt += 1) {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrf },
          body: JSON.stringify({ token, email, provider, consentPrivacy }),
        });

        const body = await response.json() as {
          error?: string;
          orderId?: string;
          status?: string;
          retryAfterSec?: number;
          downloadUrl?: string;
          redirectUrl?: string;
        };

        if (response.status === 202 && body.status === "INITIALIZING") {
          setMessage("Preparing the payment gateway...");
          const delaySec = Math.min(3, Math.max(1, Number(body.retryAfterSec ?? 1)));
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
          continue;
        }

        if (!response.ok) {
          setMessage(toUserMessage(String(body.error ?? "")));
          return;
        }

        if (body.downloadUrl && body.orderId) {
          setMessage(`Order already paid. Download ready for order ${body.orderId}.`);
          trackSeoEvent("seo_payment_success", { locale: "en", provider, reused_order: true });
          router.push(`/en/audit/r/${token}/success?orderId=${body.orderId}&downloadUrl=${encodeURIComponent(body.downloadUrl)}`);
          return;
        }

        if (body.redirectUrl && body.orderId) {
          setMessage(`Redirecting to payment gateway for order ${body.orderId}...`);
          window.location.assign(body.redirectUrl);
          return;
        }

        setMessage("The payment provider returned an invalid response. Please try again.");
        return;
      }

      setMessage("The payment gateway is still being prepared. Please try again shortly.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="card">
        <h1>Unlock Report</h1>
        <form onSubmit={onSubmit} className="grid">
          <label>
            Email
            <input
              type="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Payment Provider
            <select value={provider} onChange={(event) => setProvider(event.target.value as "MOCK" | "ZARINPAL")}>
              {allowMockProvider ? <option value="MOCK">Mock</option> : null}
              <option value="ZARINPAL">Zarinpal</option>
            </select>
          </label>
          <p>{allowMockProvider ? "Mock is available for local development only; Zarinpal is the real gateway." : "Payments are processed through Zarinpal."}</p>
          <label>
            <input
              type="checkbox"
              checked={consentPrivacy}
              onChange={(event) => setConsentPrivacy(event.target.checked)}
              required
            />{" "}
            I agree that contact and order details are stored only to unlock and follow up this report.
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>
        {message ? (
          <p role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
