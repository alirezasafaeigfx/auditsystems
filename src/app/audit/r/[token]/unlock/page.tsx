"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trackSeoEvent } from "../../../../../lib/analytics";
import { fetchCSRFHeaders } from "../../../../../lib/csrf-client";

export default function UnlockPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"MOCK" | "ZARINPAL">("MOCK");
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
    return "خطا در ایجاد سفارش. دوباره تلاش کنید.";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    trackSeoEvent("seo_unlock_started", { locale: "fa", provider });
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
        setMessage(`این سفارش قبلاً پرداخت شده. دانلود برای سفارش ${body.orderId} آماده است.`);
        trackSeoEvent("seo_payment_success", { locale: "fa", provider, reused_order: true });
        router.push(`/audit/r/${token}/success?orderId=${body.orderId}&downloadUrl=${encodeURIComponent(body.downloadUrl)}`);
        return;
      }

      if (body.redirectUrl) {
        setMessage(`در حال انتقال به درگاه پرداخت برای سفارش ${body.orderId}...`);
        window.location.href = body.redirectUrl;
        return;
      }

      setMessage(`سفارش ایجاد شد: ${body.orderId}`);
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            درگاه پرداخت
            <select value={provider} onChange={(event) => setProvider(event.target.value as "MOCK" | "ZARINPAL")}>
              <option value="MOCK">آزمایشی (Mock)</option>
              <option value="ZARINPAL">Zarinpal</option>
            </select>
          </label>
          <p>برای تست سریع می‌توانید از Mock استفاده کنید؛ برای پرداخت واقعی Zarinpal را انتخاب کنید.</p>
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
