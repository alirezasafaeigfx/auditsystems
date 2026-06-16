"use client";

import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main className="container py-10" role="main" aria-live="polite">
          <section className="card" style={{ display: 'grid', gap: '1rem' }}>
            <span className="badge">اختلال سراسری</span>
            <h1 className="text-2xl font-bold">سامانه موقتاً در دسترس نیست</h1>
            <p className="text-muted leading-6">
              یک خطای غیرمنتظره رخ داده است. لطفاً چند ثانیه بعد دوباره تلاش کنید.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button type="button" className="button" onClick={reset}>
                تلاش مجدد
              </button>
              <Link className="button secondary" href="/">
                بازگشت به خانه
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
