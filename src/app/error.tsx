"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function reportClientError(error: Error & { digest?: string }) {
  if (typeof window === "undefined") return;

  const payload = {
    eventType: "js_error",
    locale: document?.documentElement?.lang?.startsWith("en") ? "en" : "fa",
    path: window.location.pathname,
    metadata: {
      errorType: "next_error_boundary",
      message: error.message?.slice(0, 400) ?? "unknown",
      digest: error.digest ?? "",
    },
  };

  const endpoint = "/api/analytics/rum";
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
      return;
    }
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // no-op: fallback UI still works without telemetry
  }
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const isEnglish = typeof document !== "undefined" && document.documentElement.lang.startsWith("en");

  useEffect(() => {
    reportClientError(error);
    console.error("[audit-ui-error]", error);
  }, [error]);

  return (
    <main className="container py-10" role="main" aria-live="polite">
      <section className="card" style={{ display: 'grid', gap: '1rem' }}>
        <span className="badge">{isEnglish ? "Temporary issue" : "اختلال موقت"}</span>
        <h1 className="text-2xl font-bold">
          {isEnglish ? "The page encountered an issue" : "صفحه با یک خطا مواجه شد"}
        </h1>
        <p className="text-muted leading-6">
          {isEnglish
            ? "A technical error occurred while rendering this page. You can retry safely or return to the homepage."
            : "هنگام نمایش این صفحه یک خطای فنی رخ داد. می‌توانید با خیال راحت دوباره تلاش کنید یا به صفحه اصلی برگردید."}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="button" onClick={reset}>
            {isEnglish ? "Retry" : "تلاش مجدد"}
          </button>
          <Link className="button secondary" href={isEnglish ? "/en" : "/"}>
            {isEnglish ? "Back to Home" : "بازگشت به خانه"}
          </Link>
          <a className="button secondary" href="mailto:team@alirezasafaeisystems.ir">
            {isEnglish ? "Report the issue" : "گزارش خطا"}
          </a>
        </div>
      </section>
    </main>
  );
}
