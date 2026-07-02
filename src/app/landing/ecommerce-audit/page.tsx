import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seoMeta";
import HeroAuditForm from "../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/landing/ecommerce-audit",
  title: "بررسی رایگان سایت فروشگاهی - ارزیابی سئو و عملکرد",
  description: "ارزیابی رایگان سئو، سرعت و امنیت فروشگاه آنلاین شما. گزارش فوری با راه حل عملی.",
  keywords: ["بررسی سایت فروشگاهی", "سئو فروشگاه آنلاین", "ارزیابی سرعت فروشگاه", "audit ecommerce"],
});

const benefits = [
  {
    icon: "🔍",
    title: "شناسایی مشکلات مخفی",
    description: "صفحات محصول بدون عنوان، تصاویر بدون alt، لینک‌های شکسته و مشکلات سئوی فنی که مستقیماً فروش را کاهش می‌دهند.",
  },
  {
    icon: "⚡",
    title: "بهینه‌سازی سرعت",
    description: "هر ۱ ثانیه تاخیر = ۷٪ کاهش فروش. سرعت بارگذاری صفحات محصول را بهینه کنید.",
  },
  {
    icon: "🛡️",
    title: "امنیت پرداخت",
    description: "بررسی امنیت درگاه پرداخت، گواهی SSL و محافظت از اطلاعات مشتریان.",
  },
  {
    icon: "📊",
    title: "گزارش قابل اجرا",
    description: "نه فقط لیست مشکلات، بلکه راه حل گام به گام برای هر مشکل با اولویت‌بندی دقیق.",
  },
];

const steps = [
  { step: "۱", title: "آدرس سایت را وارد کنید", description: "فقط URL فروشگاه خود را در فرم زیر وارد کنید." },
  { step: "۲", title: "ارزیابی خودکار اجرا می‌شود", description: "سیستم ما سایت شما را از نظر فنی، سئو و امنیت بررسی می‌کند." },
  { step: "۳", title: "گزارش فوری دریافت کنید", description: "نتیجه ارزیابی را فوراً مشاهده کنید و بدانید چه کاری انجام دهید." },
];

export default function EcommerceAuditLanding() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">ارزیابی رایگان فروشگاه آنلاین</span>
        <h1>فروشگاه آنلاین شما چه مشکلاتی دارد؟</h1>
        <p className="hero-lead">
          با ارزیابی رایگان، مشکلات سئو، سرعت و امنیت فروشگاه خود را بشناسید و فروشتان را افزایش دهید.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>ارزیابی کامل صفحات محصول</li>
          <li>بررسی سرعت و Core Web Vitals</li>
          <li>تحلیل امنیت درگاه پرداخت</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>چرا فروشگاه آنلاین به ارزیابی فنی نیاز دارد؟</h2>
        <p>مشکلات فنی مستقیماً روی فروش و رتبه گوگل تاثیر می‌گذارند.</p>
      </section>

      <section className="feature-grid">
        {benefits.map((benefit) => (
          <article key={benefit.title} className="card feature">
            <span style={{ fontSize: "2rem" }}>{benefit.icon}</span>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        ))}
      </section>

      <section className="section-head">
        <h2>فقط ۳ مرحله تا گزارش</h2>
      </section>

      <section className="kpi-grid">
        {steps.map((step) => (
          <article key={step.step} className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ fontSize: "2rem", color: "var(--brand)" }}>{step.step}</strong>
            <h3 style={{ margin: "0.5rem 0" }}>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem", marginTop: "2rem" }}>
        <h2>همین حالا شروع کنید</h2>
        <p style={{ marginBottom: "1rem" }}>ارزیابی رایگان است و نیازی به ثبت‌نام ندارد.</p>
        <Link href="/audit" className="button">
          شروع ارزیابی رایگان
        </Link>
      </section>
    </main>
  );
}
