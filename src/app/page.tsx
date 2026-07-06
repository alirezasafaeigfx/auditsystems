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
  description: "آدرس سایت خود را وارد کنید و ببینید چه مشکلاتی دارد و چطور می‌توانید آن‌ها را حل کنید. ممیزی فنی، سئو و امنیت در کمتر از ۲ دقیقه.",
  keywords: ["ارزیابی سایت", "سئو فنی", "امنیت سایت", "core web vitals", "ممیزی فنی سایت", "بررسی سرعت سایت"],
});

export default function HomePage() {
  return (
    <main className="landing">
      <SeoPageEvent event="seo_landing_view" params={{ locale: "fa", path: "/" }} />
      <section className="card hero hero-large">
        <span className="badge hero-badge">گزارش کامل با راه حل عملی</span>
        <h1>سایت شما چه مشکلاتی دارد و چطور حلشان کنیم؟</h1>
        <p className="hero-lead">
          فقط آدرس سایت را بدهید. ما مشکلات را پیدا می‌کنیم و به شما می‌گوییم کدام یکی مهم‌تر است و چطور حلش کنید.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>گزارش ساده و قابل فهم برای همه</li>
          <li>مشکلات مهم را اول نشان می‌دهیم</li>
          <li>راه حل گام به گام برای هر مشکل</li>
        </ul>
        <div className="hero-actions">
          <AuditCtaLink ctaId="audit_landing_start" locale="fa" />
          <AuditCtaLink ctaId="audit_landing_pricing" locale="fa" />
          <AuditCtaLink ctaId="audit_landing_sample_report" locale="fa" />
        </div>
      </section>

      <section className="trust-strip">
        <article>
          <strong>سریع و آسان</strong>
          <p>فقط آدرس سایت را بدهید، بقیه‌اش با ماست</p>
        </article>
        <article>
          <strong>راه حل مشخص</strong>
          <p>برای هر مشکل، دقیقاً می‌گوییم چکار کنید</p>
        </article>
        <article>
          <strong>قابل اعتماد</strong>
          <p>روی سیستم‌های واقعی تست شده</p>
        </article>
        <SocialProofCounter />
      </section>

      <section className="trust-signals" aria-label="اطلاعات اعتماد">
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          <span>SSL و امنیت کامل</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">⚡</span>
          <span>ارزیابی در کمتر از ۲ دقیقه</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">📊</span>
          <span>گزارش با راه حل عملی</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🛡️</span>
          <span>بدون ذخیره اطلاعات خصوصی</span>
        </div>
      </section>

      <section className="card" aria-labelledby="preview-heading">
        <h2 id="preview-heading">پیش‌نمایش خروجی گزارش</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          بعد از ارزیابی، گزارش شما شامل این بخش‌ها خواهد بود:
        </p>
        <div className="kpi-grid" style={{ marginBottom: "1rem" }}>
          <article className="kpi">
            <strong style={{ color: "var(--brand)" }}>امتیاز کلی</strong>
            <p>وضعیت کلی سایت شما از ۱۰۰</p>
          </article>
          <article className="kpi">
            <strong style={{ color: "var(--danger)" }}>مشکلات سئو</strong>
            <p>مسائل فنی تأثیرگذار بر رتبه</p>
          </article>
          <article className="kpi">
            <strong style={{ color: "var(--warn)" }}>مشکلات امنیت</strong>
            <p>آسیب‌پذیری‌های قابل بهبود</p>
          </article>
          <article className="kpi">
            <strong style={{ color: "var(--brand)" }}>مشکلات سرعت</strong>
            <p>عوامل کندی بارگذاری</p>
          </article>
        </div>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <AuditCtaLink ctaId="audit_landing_sample_report_full" locale="fa" />
        </div>
      </section>

      <section className="card" aria-labelledby="subscription-heading">
        <h2 id="subscription-heading">پایش مستمر با اشتراک</h2>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          با اشتراک ماهانه، سایت شما به صورت مستمر پایش می‌شود و مشکلات جدید به موقع شناسایی می‌شوند.
        </p>
        <div className="kpi-grid">
          <article className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ color: "var(--brand)" }}>پایش ماهانه</strong>
            <p>ممیزی خودکار سئو، عملکرد و امنیت</p>
          </article>
          <article className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ color: "var(--brand)" }}>گزارش PDF</strong>
            <p>خروجی قابل چاپ و اشتراک‌گذاری</p>
          </article>
          <article className="kpi" style={{ textAlign: "center" }}>
            <strong style={{ color: "var(--brand)" }}>ممیزی زمان‌بندی شده</strong>
            <p>بررسی خودکار هفتگی یا ماهانه</p>
          </article>
        </div>
        <div className="hero-actions" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
          <Link href="/pricing" className="button">
            مشاهده پلن‌ها و قیمت‌ها
          </Link>
          <Link href="/signup" className="button secondary">
            ثبت‌نام رایگان
          </Link>
        </div>
      </section>

      <IntentRouter locale="fa" />

      <NewsletterSignup locale="fa" />

      <Testimonials />

      <section className="section-head">
        <h2>چطور این سرویس کمک می‌کند؟</h2>
        <p>از ثبت درخواست تا تحویل گزارش نهایی، همه‌چیز برای اجرای سریع طراحی شده است.</p>
      </section>

      <section className="feature-grid">
        <article className="card feature">
          <h3>جریان‌های اصلی</h3>
          <p>ثبت درخواست ارزیابی، اجرای worker در صف، لینک گزارش امن و تحویل خروجی برای تیم شما.</p>
          <Link href="/sample-report">مشاهده نمونه گزارش</Link>
        </article>
        <article className="card feature">
          <h3>ابزارهای عملیاتی</h3>
          <p>اتوماسیون roadmap، تولید مستندات، preflight پرداخت و workflow آماده‌سازی Production یکپارچه شده است.</p>
          <Link href="/pillar/iran-readiness-audit">مطالعه چارچوب ارزیابی</Link>
          <Link href="/standards">تعریف خروجی و intent map فارسی</Link>
        </article>
      </section>
    </main>
  );
}
