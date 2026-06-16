import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/seoMeta";
import SeoPageEvent from "../components/SeoPageEvent";
import IntentRouter from "../components/IntentRouter";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/",
  title: "چک کردن سایت - مشکلات و راه حل",
  description: "آدرس سایت خود را وارد کنید و ببینید چه مشکلاتی دارد و چطور می‌توانید آن‌ها را حل کنید.",
  keywords: ["ارزیابی سایت", "سئو فنی", "امنیت سایت", "core web vitals"]
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
        <ul className="hero-checklist">
          <li>گزارش ساده و قابل فهم برای همه</li>
          <li>مشکلات مهم را اول نشان می‌دهیم</li>
          <li>راه حل گام به گام برای هر مشکل</li>
        </ul>
        <div className="hero-actions">
          <Link className="button" href="/audit">
            شروع ارزیابی جدید
          </Link>
          <Link className="button secondary" href="/guides">
            راهنماها
          </Link>
          <Link className="button secondary" href="/faq">
            سوالات متداول
          </Link>
          <Link className="button secondary" href="/sample-report">
            نمونه گزارش
          </Link>
          <Link
            className="button secondary"
            href="https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=cross_site&utm_campaign=alireza_safaei_network&utm_content=hero_contact"
            target="_blank"
            rel="noopener noreferrer"
          >
            مشاوره و ارتباط مستقیم
          </Link>
          <Link
            className="button secondary"
            href="https://persiantoolbox.ir/?utm_source=audit&utm_medium=cross_site&utm_campaign=alireza_safaei_network&utm_content=hero_toolbox"
            target="_blank"
            rel="noopener noreferrer"
          >
            ابزارهای فارسی PersianToolbox
          </Link>
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
      </section>

      <IntentRouter locale="fa" />

      <section className="kpi-grid">
        <article className="kpi">
          <strong>22/22</strong>
          <p>عبور کامل چک‌های فازهای Done در اتوماسیون</p>
        </article>
        <article className="kpi">
          <strong>10</strong>
          <p>مسیر API عملیاتی و مستند</p>
        </article>
        <article className="kpi">
          <strong>20+</strong>
          <p>صفحه سئو-آماده در دو زبان فارسی و انگلیسی</p>
        </article>
        <article className="kpi">
          <strong>4</strong>
          <p>پایپلاین CI برای roadmap، docs، readiness و main gate</p>
        </article>
      </section>

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
