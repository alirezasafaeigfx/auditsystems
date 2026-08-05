"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackSeoEvent } from "../../../../../lib/analytics";
import { fetchCSRFHeaders } from "../../../../../lib/csrf-client";

const allowMockProvider = process.env.NODE_ENV !== "production";
const INITIALIZING_RETRIES = 3;

export default function UnlockPage() {
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
    trackSeoEvent("seo_unlock_page_view", { locale: "fa", path: `/audit/r/${token}/unlock` });
  }, [token]);

  function toUserMessage(errorCode: string): string {
    if (errorCode === "INVALID_EMAIL") return "ایمیل معتبر نیست.";
    if (errorCode === "CONSENT_REQUIRED") return "برای ایجاد سفارش باید با ذخیره اطلاعات همین درخواست موافقت کنید.";
    if (errorCode === "NOT_FOUND") return "گزارش پیدا نشد یا در دسترس نیست.";
    if (errorCode === "REPORT_NOT_READY") return "گزارش هنوز آماده نشده است.";
    if (errorCode === "RATE_LIMITED") return "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
    if (errorCode === "PAYMENT_PROVIDER_UNAVAILABLE") return "درگاه پرداخت در حال حاضر در دسترس نیست.";
    if (errorCode === "PAYMENT_PROVIDER_TIMEOUT") return "پاسخ درگاه پرداخت بیش از حد طول کشید. دوباره تلاش کنید.";
    if (errorCode === "CHECKOUT_RETRY_REQUIRED") return "وضعیت سفارش تغییر کرده است. دوباره تلاش کنید.";
    return "خطا در ایجاد سفارش. دوباره تلاش کنید.";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    trackSeoEvent("seo_unlock_started", { locale: "fa", provider });
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
          setMessage("درگاه در حال آماده‌سازی است...");
          const delaySec = Math.min(3, Math.max(1, Number(body.retryAfterSec ?? 1)));
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
          continue;
        }

        if (!response.ok) {
          setMessage(toUserMessage(String(body.error ?? "")));
          return;
        }

        if (body.downloadUrl && body.orderId) {
          setMessage(`این سفارش قبلاً پرداخت شده. دانلود برای سفارش ${body.orderId} آماده است.`);
          trackSeoEvent("seo_payment_success", { locale: "fa", provider, reused_order: true });
          router.push(`/audit/r/${token}/success?orderId=${body.orderId}&downloadUrl=${encodeURIComponent(body.downloadUrl)}`);
          return;
        }

        if (body.redirectUrl && body.orderId) {
          setMessage(`در حال انتقال به درگاه پرداخت برای سفارش ${body.orderId}...`);
          window.location.assign(body.redirectUrl);
          return;
        }

        setMessage("پاسخ معتبر از درگاه دریافت نشد. دوباره تلاش کنید.");
        return;
      }

      setMessage("آماده‌سازی درگاه هنوز کامل نشده است. چند لحظه بعد دوباره تلاش کنید.");
    } catch {
      setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="card">
        <h1>فعال‌سازی گزارش</h1>
        <form onSubmit={onSubmit} className="grid">
          <label>
            ایمیل
            <input
              type="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            درگاه پرداخت
            <select value={provider} onChange={(event) => setProvider(event.target.value as "MOCK" | "ZARINPAL")}>
              {allowMockProvider ? <option value="MOCK">آزمایشی (Mock)</option> : null}
              <option value="ZARINPAL">Zarinpal</option>
            </select>
          </label>
          <p>{allowMockProvider ? "Mock فقط برای توسعه محلی است؛ Zarinpal درگاه پرداخت واقعی است." : "پرداخت از طریق Zarinpal انجام می‌شود."}</p>
          <label>
            <input
              type="checkbox"
              checked={consentPrivacy}
              onChange={(event) => setConsentPrivacy(event.target.checked)}
              required
            />{" "}
            موافقم اطلاعات تماس و سفارش فقط برای فعال‌سازی و پیگیری همین گزارش ذخیره شود.
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ارسال..." : "ادامه"}
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
