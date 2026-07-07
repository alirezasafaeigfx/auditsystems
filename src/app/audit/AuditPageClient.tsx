"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AuditCtaLink from "../../components/AuditCtaLink";
import { trackSeoEvent } from "../../lib/analytics";
import { fetchCSRFHeaders } from "../../lib/csrf-client";

const RETRYABLE_ERRORS = new Set(["RATE_LIMITED", "DNS_LOOKUP_FAILED", "RATE_LIMIT_BACKEND_REQUIRED"]);

export default function AuditPageClient() {
  const [url, setUrl] = useState("https://example.com");
  const [depth, setDepth] = useState<"QUICK" | "DEEP">("QUICK");
  const [message, setMessage] = useState("");
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    trackSeoEvent("seo_audit_page_view", { locale: "fa", path: "/audit" });
    const params = new URLSearchParams(window.location.search);
    const prefillUrl = params.get("url");
    if (prefillUrl) {
      setUrl(decodeURIComponent(prefillUrl));
    }
  }, []);

  function toUserMessage(errorCode: string): { text: string; retryable: boolean } {
    if (errorCode === "RATE_LIMITED") return { text: "تعداد درخواست‌ها زیاد است. چند دقیقه بعد دوباره تلاش کنید.", retryable: true };
    if (errorCode === "DNS_LOOKUP_FAILED") return { text: "بررسی دامنه به سرویس DNS نیاز دارد؛ لطفاً کمی بعد تلاش کنید.", retryable: true };
    if (errorCode === "RATE_LIMIT_BACKEND_REQUIRED") return { text: "سرویس محدودسازی توزیع‌شده موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.", retryable: true };
    if (errorCode === "INVALID_URL_EMPTY") return { text: "آدرس وارد نشده است.", retryable: false };
    if (errorCode === "INVALID_URL_TOO_LONG") return { text: "آدرس خیلی طولانی است.", retryable: false };
    if (errorCode.startsWith("INVALID_URL_")) return { text: "آدرس معتبر نیست. لطفا URL کامل و عمومی وارد کنید.", retryable: false };
    if (errorCode.startsWith("SSRF_BLOCKED_")) return { text: "این آدرس قابل بررسی نیست. لطفا یک دامنه عمومی و در دسترس وارد کنید.", retryable: false };
    return { text: "ثبت درخواست با خطا روبه‌رو شد. دوباره تلاش کنید.", retryable: true };
  }

  function normalizeUrl(raw: string): string {
    const cleaned = raw.trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  }

  const executeAudit = useCallback(async (targetUrl: string, auditDepth: "QUICK" | "DEEP") => {
    setIsSubmitting(true);
    setMessage("در حال ثبت درخواست ارزیابی...");
    setReportPath(null);
    setLastError(null);

    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch("/api/audit/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ url: targetUrl, depth: auditDepth })
      });

      const body = await response.json();
      if (!response.ok) {
        const errorInfo = toUserMessage(String(body.error ?? ""));
        setMessage(errorInfo.text);
        setLastError(String(body.error ?? ""));
        trackSeoEvent("seo_audit_error", { locale: "fa", error_code: String(body.error ?? ""), retryable: errorInfo.retryable });
        return;
      }

      const nextPath = `/audit/r/${body.token}`;
      setReportPath(nextPath);
      setLastError(null);
      setRetryCount(0);
      setMessage(`درخواست ثبت شد. شناسه ارزیابی: ${body.runId}`);
      trackSeoEvent("seo_audit_run_created", { locale: "fa", depth: auditDepth, run_status: String(body.status ?? "QUEUED") });
    } catch {
      setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
      setLastError("NETWORK_ERROR");
      trackSeoEvent("seo_audit_error", { locale: "fa", error_code: "NETWORK_ERROR", retryable: true });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  function handleRetry() {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;
    setRetryCount((c) => c + 1);
    trackSeoEvent("seo_audit_retry", { locale: "fa", retry_count: retryCount + 1 });
    executeAudit(normalizedUrl, depth);
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

    trackSeoEvent("seo_audit_start", { locale: "fa", depth, has_url: !!normalizedUrl });
    executeAudit(normalizedUrl, depth);
  }

  const isRetryable = lastError !== null && (
    RETRYABLE_ERRORS.has(lastError) || lastError === "NETWORK_ERROR"
  );

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
              <AuditCtaLink ctaId="audit_home_sample_report" locale="fa" />
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
          {isRetryable && !isSubmitting && !reportPath ? (
            <button type="button" onClick={handleRetry} className="button retry-button">
              {retryCount > 0 ? `تلاش مجدد (${retryCount + 1})` : "تلاش مجدد"}
            </button>
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
