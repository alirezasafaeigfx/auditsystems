import Link from "next/link";
import { getCaseStudies } from "../../content/case-studies";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";

const studies = getCaseStudies("fa");

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/case-studies",
  title: "نمونه کارها و موفقیت‌ها",
  description: "نمونه کارهای موفق ASDEV Audit در بهبود عملکرد، امنیت و سئوی وب‌سایت‌های مختلف.",
  keywords: ["نمونه کار سئو", "موفقیت بهینه‌سازی سایت", "گزارش موفقیت آژانس", "بهبود امنیت وردپرس"]
});

export default function CaseStudiesIndexPage() {
  return (
    <main>
      <section className="card hero">
        <h1>نمونه کارها و موفقیت‌ها</h1>
        <p>نمونه کارهای موفق ASDEV Audit در بهبود عملکرد، امنیت و سئوی وب‌سایت‌های مختلف.</p>
      </section>

      <section className="guide-grid">
        {studies.map((study) => (
          <article key={study.slug} className="guide-item">
            <h2>{study.title}</h2>
            <p><strong>مشتری:</strong> {study.client}</p>
            <p>{study.problem}</p>
            <div className="score-comparison">
              <span>امتیاز قبل: <strong>{study.scoreBefore}</strong></span>
              <span> → </span>
              <span>امتیاز بعد: <strong>{study.scoreAfter}</strong></span>
            </div>
            <p className="text-sm text-muted">آخرین بروزرسانی: {study.updatedAt}</p>
            <p>
              <Link href={`/case-studies/${study.slug}`}>مشاهده جزئیات</Link>
            </p>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>شروع کنید</h2>
        <p>همین حالا وب‌سایت خود را رایگان بررسی کنید و نتایج مشابهی کسب کنید.</p>
        <p>
          <Link href="/" className="btn">
            شروع بررسی رایگان
          </Link>
        </p>
      </section>
    </main>
  );
}
