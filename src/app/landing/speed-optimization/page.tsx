import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seoMeta";
import HeroAuditForm from "../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/landing/speed-optimization",
  title: "بهینه‌سازی سرعت سایت - بررسی رایگان عملکرد",
  description: "ارزیابی رایگان سرعت وب‌سایت شامل Core Web Vitals، زمان بارگذاری و بهینه‌سازی عملکرد.",
  keywords: ["بهینه‌سازی سرعت سایت", "بررسی سرعت", "core web vitals", "speed optimization"],
});

const speedFactors = [
  { icon: "⚡", title: "زمان بارگذاری اولیه", description: "سرعت دریافت اولین بایت از سرور (TTFB)" },
  { icon: "🖼️", title: "بهینه‌سازی تصاویر", description: "حجم، فرمت و بارگذاری تنبل تصاویر" },
  { icon: "📜", title: "اسکریپت‌ها", description: "blocking و non-blocking بودن JS و CSS" },
  { icon: "🗄️", title: "کشینگ", description: "تنظیمات کش مرورگر و سرور" },
  { icon: "🌐", title: "CDN", description: "استفاده از شبکه تحویل محتوا" },
  { icon: "📊", title: "Core Web Vitals", description: "LCP، CLS و INP معیارهای گوگل" },
];

export default function SpeedOptimizationLanding() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">ارزیابی رایگان سرعت</span>
        <h1>سایت شما چقدر سریع است؟</h1>
        <p className="hero-lead">
          با ارزیابی رایگان سرعت، عوامل کندی سایت خود را بشناسید و تجربه کاربری را بهبود دهید.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>بررسی Core Web Vitals</li>
          <li>تحلیل سرعت بارگذاری</li>
          <li>پیشنهادات بهینه‌سازی</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>چه عواملی بررسی می‌شود؟</h2>
      </section>

      <section className="feature-grid">
        {speedFactors.map((factor) => (
          <article key={factor.title} className="card feature">
            <span style={{ fontSize: "2rem" }}>{factor.icon}</span>
            <h3>{factor.title}</h3>
            <p>{factor.description}</p>
          </article>
        ))}
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem", marginTop: "2rem" }}>
        <h2>سرعت سایت خود را همین حالا بررسی کنید</h2>
        <p style={{ marginBottom: "1rem" }}>ارزیابی رایگان است و نتیجه فوری دریافت می‌کنید.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Link href="/audit" className="button">
            شروع ارزیابی سرعت
          </Link>
          <Link href="/pricing" className="button secondary">
            پایش مستمر با اشتراک
          </Link>
        </div>
      </section>
    </main>
  );
}
