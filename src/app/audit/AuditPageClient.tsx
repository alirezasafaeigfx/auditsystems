"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { trackSeoEvent } from "../../lib/analytics";

export default function AuditPageClient() {
  const [url, setUrl] = useState("https://example.com");
  const [depth, setDepth] = useState<"QUICK" | "DEEP">("QUICK");
  const [message, setMessage] = useState("");
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackSeoEvent("seo_audit_page_view", { locale: "fa", path: "/audit" });
    const params = new URLSearchParams(window.location.search);
    const prefillUrl = params.get("url");
    if (prefillUrl) {
      setUrl(decodeURIComponent(prefillUrl));
    }
  }, []);

  function toUserMessage(errorCode: string): string {
    if (errorCode === "RATE_LIMITED") return "تعداد درخواست‌ها زیاد است. چند دقیقه بعد دوباره تلاش کنید.";
    if (errorCode === "DNS_LOOKUP_FAILED") return "بررسی دامنه به سرویس DNS نیاز دارد؛ لطفاً کمی بعد تلاش کنید.";
    if (errorCode === "RATE_LIMIT_BACKEND_REQUIRED") return "سرویس محدودسازی توزیع‌شده موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.";
    if (errorCode === "INVALID_URL_EMPTY") return "آدرس وارد نشده است.";
    if (errorCode === "INVALID_URL_TOO_LONG") return "آدرس خیلی طولانی است.";
    if (errorCode.startsWith("INVALID_URL_")) return "آدرس معتبر نیست. لطفا URL کامل و عمومی وارد کنید.";
    if (errorCode.startsWith("SSRF_BLOCKED_")) return "این آدرس قابل بررسی نیست. لطفا یک دامنه عمومی و در دسترس وارد کنید.";
    return "ثبت درخواست با خطا روبه‌رو شد. دوباره تلاش کنید.";
  }

  function normalizeUrl(raw: string): string {
    const cleaned = raw.trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setMessage("لطفا آدرس سایت را وارد کنید.");
      return;
    }

    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        setMessage("آدرس واردشده معتبر نیست. لطفا دامنه کامل وارد کنید.");
        return;
      }
    } catch {
      setMessage("فرمت آدرس صحیح نیست. نمونه درست: https://example.com");
      return;
    }

    trackSeoEvent("seo_audit_start", { locale: "fa", depth });
    setIsSubmitting(true);
    setMessage("در حال ثبت درخواست ارزیابی...");
    setReportPath(null);

    try {
      const response = await fetch("/api/audit/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, depth })
      });

      const body = await response.json();
      if (!response.ok) {
        setMessage(toUserMessage(String(body.error ?? "")));
        return;
      }

      const nextPath = `/audit/r/${body.token}`;
      setReportPath(nextPath);
      setMessage(`درخواست ثبت شد. شناسه ارزیابی: ${body.runId}`);
      trackSeoEvent("seo_audit_run_created", { locale: "fa", depth, run_status: String(body.status ?? "QUEUED") });
    } catch {
      setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusTone = reportPath
    ? "is-success"
    : message && (message.includes("خطا") || message.includes("معتبر نیست") || message.includes("قابل بررسی نیست"))
      ? "is-danger"
      : message
        ? "is-info"
        : "is-idle";

  return (
    <main className="audit-page">
      <section className="card hero hero-large">
        <span className="badge hero-badge">شروع ارزیابی</span>
        <h1>ارزیابی جدید سایت را در کمتر از یک دقیقه ثبت کنید</h1>
        <p className="hero-lead">آدرس سایت را وارد کنید. بعد از ثبت، پردازش خودکار شروع می‌شود و لینک گزارش اختصاصی تحویل می‌گیرید.</p>
      </section>

      <section className="audit-layout">
        <section className="card audit-form-card">
          <form onSubmit={onSubmit} className="grid audit-form">
            <label>
              آدرس هدف
              <input
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com یا https://example.com"
                required
              />
              <span className="hint">دامنه عمومی و قابل دسترس وارد کنید. مثال: `https://example.com`</span>
            </label>

            <fieldset className="depth-picker">
              <legend>عمق تحلیل</legend>
              <div className="depth-options">
                <label className={`depth-option ${depth === "QUICK" ? "is-active" : ""}`}>
                  <input type="radio" name="depth" value="QUICK" checked={depth === "QUICK"} onChange={() => setDepth("QUICK")} />
                  <strong>سریع</strong>
                  <p>برای بررسی اولیه و تصمیم‌گیری سریع تیم.</p>
                </label>
                <label className={`depth-option ${depth === "DEEP" ? "is-active" : ""}`}>
                  <input type="radio" name="depth" value="DEEP" checked={depth === "DEEP"} onChange={() => setDepth("DEEP")} />
                  <strong>عمیق</strong>
                  <p>برای تحلیل کامل‌تر مسیرها و یافتن ریسک‌های پنهان.</p>
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "در حال ثبت..." : "ثبت ارزیابی"}
              </button>
              <Link href="/sample-report" className="button secondary">
                مشاهده نمونه خروجی
              </Link>
            </div>
          </form>
        </section>

        <section className="card grid status-panel">
          <h2>وضعیت ارزیابی</h2>
          <p role="status" aria-live="polite" className={`status-note ${statusTone}`}>
            {message || "هنوز درخواستی ثبت نشده است."}
          </p>
          {reportPath ? (
            <Link href={reportPath} className="button">
              باز کردن گزارش
            </Link>
          ) : null}

          <div className="status-steps">
            <article>
              <strong>1) ثبت درخواست</strong>
              <p>URL سایت و نوع تحلیل را ثبت می‌کنید.</p>
            </article>
            <article>
              <strong>2) پردازش خودکار</strong>
              <p>تسک در صف قرار می‌گیرد و بررسی شروع می‌شود.</p>
            </article>
            <article>
              <strong>3) تحویل گزارش</strong>
              <p>لینک گزارش آماده بررسی تیم شما خواهد بود.</p>
            </article>
          </div>
        </section>
      </section>

      <section className="feature-grid">
        <article className="card feature">
          <h3>چه چیزی دریافت می‌کنید؟</h3>
          <p>فهرست یافته‌ها با شدت ریسک، پیشنهاد اقدام و مسیر اصلاح.</p>
        </article>
        <article className="card feature">
          <h3>برای چه تیمی مناسب است؟</h3>
          <p>تیم‌های فنی، محصول و رشد که تصمیم‌گیری سریع می‌خواهند.</p>
        </article>
      </section>
    </main>
  );
}
