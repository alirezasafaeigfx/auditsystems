import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/seoMeta";
import AuditCtaLink from "../components/AuditCtaLink";
import SeoPageEvent from "../components/SeoPageEvent";
import IntentRouter from "../components/IntentRouter";
import HeroAuditForm from "../components/HeroAuditForm";
import SocialProofCounter from "../components/SocialProofCounter";
import NewsletterSignup from "../components/NewsletterSignup";
import Testimonials from "../components/Testimonials";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/",
  title: "چک کردن سایت - مشکلات و راه حل",
  description: "آدرس سایت خود را وارد کنید تا بررسی‌های قابل اجرا انجام شوند و مشکلات مشاهده‌شده، میزان پوشش و گام‌های بعدی را ببینید.",
  keywords: ["ارزیابی سایت", "سئو فنی", "امنیت سایت", "core web vitals", "ممیزی فنی سایت", "بررسی سرعت سایت"],
});

export default function HomePage() {
  return (
    <main className="landing">
      <SeoPageEvent event="seo_landing_view" params={{ locale: "fa", path: "/" }} />
      <section className="card hero hero-large">
        <span className="badge hero-badge">گزارش فنی با گام‌های پیشنهادی</span>
        <h1>سایت شما کجا نیاز به توجه دارد؟</h1>
        <p className="hero-lead">
          آدرس عمومی سایت را وارد کنید. نتیجه، فقط درباره بررسی‌هایی است که واقعاً اجرا شده‌اند و موارد اندازه‌گیری‌نشده جدا مشخص می‌شوند.
        </p>
        <HeroAuditForm locale="fa" />
        <ul className="hero-checklist">
          <li>موارد مشاهده‌شده با زبان ساده و بر اساس اهمیت</li>
          <li>پوشش و محدودیت هر بررسی به‌صورت روشن</li>
          <li>گام پیشنهادی برای پیگیری هر مشکل</li>
        </ul>
        <div className="hero-actions">
          <Link className="button secondary" href="/qualification">
            درخواست بررسی تخصصی
          </Link>
          <AuditCtaLink ctaId="audit_landing_sample_report" locale="fa" />
        </div>
      </section>

      <section className="social-proof-section" aria-label="آمار ارزیابی">
        <SocialProofCounter />
      </section>

      <section className="how-it-works" aria-label="نحوه کار">
        <h2>در ۳ مرحله ساده</h2>
        <div className="how-steps">
          <div className="how-step">
            <span className="how-step-num">۱</span>
            <strong>آدرس سایت را وارد کنید</strong>
            <p>آدرس عمومی سایتی را که می‌خواهید بررسی شود وارد کنید.</p>
          </div>
          <div className="how-step-connector" aria-hidden="true" />
          <div className="how-step">
            <span className="how-step-num">۲</span>
            <strong>بررسی‌های قابل اجرا انجام می‌شوند</strong>
            <p>سئو فنی، نشانه‌های امنیتی و عملکرد تا جایی که قابل اندازه‌گیری باشند بررسی می‌شوند.</p>
          </div>
          <div className="how-step-connector" aria-hidden="true" />
          <div className="how-step">
            <span className="how-step-num">۳</span>
            <strong>نتیجه و گام بعدی را ببینید</strong>
            <p>موارد مشاهده‌شده، محدودیت‌های بررسی و اقدام پیشنهادی کنار هم نمایش داده می‌شوند.</p>
          </div>
        </div>
      </section>

      <section className="trust-signals" aria-label="حدود و شیوه گزارش">
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">🔎</span>
          <span>نتیجه فقط برای بررسی‌هایی که واقعاً اجرا شده‌اند</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">⏱️</span>
          <span>زمان اجرا به سایت و بررسی‌های در دسترس بستگی دارد</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">📊</span>
          <span>موارد مهم‌تر و گام‌های پیشنهادی در اولویت</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true">🧭</span>
          <span>موارد اندازه‌گیری‌نشده جدا از نتیجه قطعی نمایش داده می‌شوند</span>
        </div>
      </section>

      <section className="card" aria-labelledby="preview-heading">
        <h2 id="preview-heading">پیش‌نمایش خروجی گزارش</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          بسته به پوشش بررسی، گزارش می‌تواند این بخش‌ها را داشته باشد:
        </p>
        <div className="kpi-grid" style={{ marginBottom: "1rem" }}>
          <article className="kpi">
            <strong style={{ color: "var(--brand)" }}>وضعیت کلی</strong>
            <p>در صورت پوشش کافی، جمع‌بندی قابل اتکا از وضعیت سایت</p>
          </article>
          <article className="kpi">
            <strong style={{ color: "var(--danger)" }}>موارد سئو</strong>
            <p>مسائل فنی مشاهده‌شده که می‌توانند روی جست‌وجو اثر بگذارند</p>
          </article>
          <article className="kpi">
            <strong style={{ color: "var(--warn)" }}>نشانه‌های امنیتی</strong>
            <p>تنظیمات و نشانه‌های قابل بررسی، بدون ادعای تضمین امنیت</p>
          </article>
          <article className="kpi">
            <strong style={{ color: "var(--brand)" }}>عملکرد</strong>
            <p>شواهد عملکردی که در زمان بررسی در دسترس بوده‌اند</p>
          </article>
        </div>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <AuditCtaLink ctaId="audit_landing_sample_report_full" locale="fa" />
        </div>
      </section>

      <section className="card" aria-labelledby="subscription-heading">
        <h2 id="subscription-heading">پایش مستمر با اشتراک</h2>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          برای سایت‌هایی که نیاز به بررسی دوره‌ای دارند، می‌توانید مسیر پایش و گزارش‌های بعدی را انتخاب کنید.
        </p>
        <div className="kpi-grid">
          <article className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ color: "var(--brand)" }}>پایش دوره‌ای</strong>
            <p>اجرای ارزیابی‌های زمان‌بندی‌شده بر اساس تنظیمات شما</p>
          </article>
          <article className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ color: "var(--brand)" }}>گزارش PDF</strong>
            <p>خروجی قابل چاپ برای مرور و پیگیری</p>
          </article>
          <article className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ color: "var(--brand)" }}>مقایسه روند</strong>
            <p>مرور تغییرات بین ارزیابی‌های ثبت‌شده</p>
          </article>
        </div>
        <div className="hero-actions" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
          <AuditCtaLink ctaId="audit_landing_pricing_plans" locale="fa" />
          <AuditCtaLink ctaId="audit_landing_signup_free" locale="fa" />
        </div>
      </section>

      <IntentRouter locale="fa" />

      <NewsletterSignup locale="fa" />

      <Testimonials />

      <section className="section-head">
        <h2>بعد از ثبت آدرس چه می‌شود؟</h2>
        <p>می‌توانید از ارزیابی خودکار شروع کنید، نمونه خروجی را ببینید یا برای بررسی تخصصی درخواست ثبت کنید.</p>
      </section>

      <section className="feature-grid">
        <article className="card feature">
          <h3>ارزیابی خودکار</h3>
          <p>موارد قابل بررسی اولویت‌بندی می‌شوند و نتیجه همراه با محدودیت‌های اندازه‌گیری و گام پیشنهادی نمایش داده می‌شود.</p>
          <AuditCtaLink ctaId="audit_landing_feature_sample" locale="fa" className="" />
        </article>
        <article className="card feature">
          <h3>بررسی تخصصی</h3>
          <p>اگر ارزیابی خودکار برای تصمیم شما کافی نیست، درخواست بررسی انسانی ثبت کنید تا نیاز و دامنه کار جداگانه بررسی شود.</p>
          <Link href="/qualification">ثبت درخواست بررسی تخصصی</Link>
          <Link href="/standards">تعریف خروجی و معیارهای ارزیابی</Link>
        </article>
      </section>
    </main>
  );
}
