import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seoMeta";
import HeroAuditForm from "../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/landing/speed-optimization",
  title: "بررسی رایگان سرعت سایت - بهینه‌سازی عملکرد",
  description: "ارزیابی رایگان سرعت سایت شما. شناسایی مشکلات عملکرد و دریافت راه حل بهینه‌سازی.",
  keywords: ["بررسی سرعت سایت", "بهینه‌سازی سرعت", "سرعت بارگذاری", "speed optimization"],
});

const benefits = [
  {
    icon: "🔍",
    title: "شناسایی گلوگاه‌ها",
    description: "صفحات کند، تصاویر بهینه نشده و کدهای اضافی که سرعت بارگذاری را کاهش می‌دهند.",
  },
  {
    icon: "⚡",
    title: "Core Web Vitals",
    description: "بررسی LCP، FID و CLS که مستقیماً روی رتبه‌بندی گوگل و تجربه کاربری تاثیر می‌گذارند.",
  },
  {
    icon: "🛡️",
    title: "بهینه‌سازی سرور",
    description: "بررسی کش مرورگر، فشرده‌سازی gzip و تنظیمات سرور برای بارگذاری سریع‌تر.",
  },
  {
    icon: "📊",
    title: "گزارش قابل اجرا",
    description: "نه فقط لیست مشکلات، بلکه راه حل گام به گام برای هر مشکل با اولویت‌بندی دقیق.",
  },
];

const steps = [
  { step: "۱", title: "آدرس سایت را وارد کنید", description: "فقط URL سایت خود را در فرم زیر وارد کنید." },
  { step: "۲", title: "ارزیابی خودکار اجرا می‌شود", description: "سیستم ما سایت شما را از نظر سرعت و عملکرد بررسی می‌کند." },
  { step: "۳", title: "گزارش فوری دریافت کنید", description: "نتیجه ارزیابی را فوراً مشاهده کنید و بدانید چه کاری انجام دهید." },
];

const faq = [
  {
    q: "آیا ارزیابی واقعاً رایگان است؟",
    a: "بله، ارزیابی پایه کاملاً رایگان است و نیازی به ثبت‌نام ندارد.",
  },
  {
    q: "آیا این ابزار جایگزین PageSpeed Insights گوگل است؟",
    a: "خیر، این ابزار مکمل PageSpeed Insights است و راه حل‌های عملی‌تری ارائه می‌دهد.",
  },
  {
    q: "چه مدت طول می‌کشد تا گزارش آماده شود؟",
    a: "ارزیابی معمولاً کمتر از ۲ دقیقه طول می‌کشد و گزارش فوراً قابل مشاهده است.",
  },
  {
    q: "آیا اطلاعات سایت من امن است؟",
    a: "بله، ما هیچ اطلاعات حساسی ذخیره نمی‌کنیم و فقط داده‌های عمومی سایت شما را بررسی می‌کنیم.",
  },
  {
    q: "آیا می‌توانم گزارش PDF دریافت کنم؟",
    a: "بله، در ارزیابی پیشرفته می‌توانید گزارش کامل PDF با جزئیات فنی دریافت کنید.",
  },
];

export default function SpeedOptimizationLanding() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">ارزیابی رایگان سرعت سایت</span>
        <h1>سرعت سایت شما چقدر است؟</h1>
        <p className="hero-lead">
          با ارزیابی رایگان، مشکلات سرعت و عملکرد سایت خود را بشناسید و تجربه کاربری را بهبود دهید.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>بررسی Core Web Vitals</li>
          <li>ارزیابی سرعت بارگذاری صفحات</li>
          <li>تحلیل بهینه‌سازی سرور</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>چرا سایت به بهینه‌سازی سرعت نیاز دارد؟</h2>
        <p>هر ۱ ثانیه تاخیر = ۷٪ کاهش فروش. سرعت مستقیماً روی تجربه کاربری و رتبه‌بندی گوگل تاثیر می‌گذارد.</p>
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
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Link href="/audit" className="button">
            شروع ارزیابی رایگان
          </Link>
          <Link href="/pricing" className="button secondary">
            پایش مستمر با اشتراک
          </Link>
        </div>
      </section>

      <section className="section-head" style={{ marginTop: "3rem" }}>
        <h2>سوالات متداول</h2>
      </section>

      <section className="card" style={{ maxWidth: "800px", margin: "0 auto 2rem" }}>
        {faq.map((item) => (
          <article key={item.q} style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
