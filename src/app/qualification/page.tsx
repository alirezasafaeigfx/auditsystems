import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";
import QualificationForm from "./QualificationForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/qualification",
  title: "درخواست ارزیابی ASDEV Audit",
  description: "فرم qualification برای درخواست Audit فنی، سئو، عملکرد و امنیت سایت.",
  keywords: ["درخواست audit", "ارزیابی سایت", "ممیزی فنی سایت"],
});

export default function QualificationPage() {
  return (
    <main className="audit-page">
      <section className="card hero hero-large">
        <span className="badge hero-badge">درخواست ارزیابی</span>
        <h1>برای Audit دستی و قابل تحویل درخواست بدهید</h1>
        <p className="hero-lead">
          این مسیر برای کسب‌وکارهایی است که گزارش قابل ارائه، اولویت‌بندی اصلاحات و تحویل دستی می‌خواهند.
        </p>
      </section>
      <section className="audit-layout">
        <QualificationForm />
        <aside className="card grid">
          <h2>مناسب برای چه کسانی است؟</h2>
          <ul>
            <li>سایت فعال با مشکل فنی، سئو، سرعت یا امنیت</li>
            <li>تیم یا آژانسی که نیاز به گزارش قابل تحویل دارد</li>
            <li>مالک کسب‌وکاری که می‌خواهد اولویت اصلاحات را بداند</li>
          </ul>
          <h2>نامناسب برای چه کسانی است؟</h2>
          <ul>
            <li>سایت‌های بدون دامنه عمومی یا محتوای قابل بررسی</li>
            <li>درخواست تضمین رتبه، فروش یا نتیجه قطعی</li>
            <li>نیاز به دسترسی خصوصی بدون قرارداد جداگانه</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
