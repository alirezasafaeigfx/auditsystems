"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackSeoEvent } from "../../../../../../lib/analytics";
import { fetchCSRFHeaders } from "../../../../../../lib/csrf-client";

export default function UnlockPageEn() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"MOCK" | "ZARINPAL">("MOCK");
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
    return "Failed to create order. Please try again.";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    trackSeoEvent("seo_unlock_started", { locale: "en", provider });
    setIsSubmitting(true);
    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch(`/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ token, email, provider, consentPrivacy })
      });

      const body = await response.json();
      if (!response.ok) {
        setMessage(toUserMessage(String(body.error ?? "")));
        return;
      }

      if (body.downloadUrl) {
        setMessage(`Order already paid. Download ready for order ${body.orderId}.`);
        trackSeoEvent("seo_payment_success", { locale: "en", provider, reused_order: true });
        router.push(`/en/audit/r/${token}/success?orderId=${body.orderId}&downloadUrl=${encodeURIComponent(body.downloadUrl)}`);
        return;
      }

      if (body.redirectUrl) {
        setMessage(`Redirecting to payment gateway for order ${body.orderId}...`);
        window.location.href = body.redirectUrl;
        return;
      }

      setMessage(`Order created: ${body.orderId}`);
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Payment Provider
            <select value={provider} onChange={(event) => setProvider(event.target.value as "MOCK" | "ZARINPAL")}>
              <option value="MOCK">Mock</option>
              <option value="ZARINPAL">Zarinpal</option>
            </select>
          </label>
          <p>Use Mock for local test flow and Zarinpal for real gateway checkout.</p>
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
