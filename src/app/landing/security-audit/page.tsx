import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seoMeta";
import HeroAuditForm from "../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/landing/security-audit",
  title: "ارزیابی امنیت وب‌سایت - بررسی رایگان آسیب‌پذیری‌ها",
  description: "ارزیابی رایگان امنیت وب‌سایت شامل بررسی هدرها، HTTPS، XSS، CSRF و محافظت از داده‌ها.",
  keywords: ["ارزیابی امنیت سایت", "بررسی آسیب‌پذیری", "audit security", "website security check"],
});

const securityChecks = [
  { icon: "🔒", title: "هدرهای امنیتی", description: "بررسی CSP، HSTS، X-Frame-Options و سایر هدرهای امنیتی" },
  { icon: "🛡️", title: "گواهی SSL", description: " اعتبار و تنظیمات گواهی HTTPS" },
  { icon: "🔐", title: "محافظت XSS", description: "بررسی آسیب‌پذیری در برابر حملات Cross-Site Scripting" },
  { icon: "🔑", title: "محافظت CSRF", description: "بررسی محافظت در برابر حملات Cross-Site Request Forgery" },
  { icon: "📦", title: "امنیت کوکی‌ها", description: "بررسی تنظیمات Secure، HttpOnly و SameSite کوکی‌ها" },
  { icon: "🕵️", title: "حریم خصوصی", description: "بررسی جمع‌آوری و نگهداری داده‌های کاربران" },
];

export default function SecurityAuditLanding() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">ارزیابی رایگان امنیت</span>
        <h1>سایت شما در برابر حملات چقدر ایمن است؟</h1>
        <p className="hero-lead">
          با ارزیابی رایگان امنیت، آسیب‌پذیری‌های وب‌سایت خود را بشناسید و از حملات جلوگیری کنید.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>بررسی کامل هدرهای امنیتی</li>
          <li>تحلیل آسیب‌پذیری‌های رایج</li>
          <li>راهنمای اصلاح مشکلات امنیتی</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>چه چیزهایی بررسی می‌شود؟</h2>
      </section>

      <section className="feature-grid">
        {securityChecks.map((check) => (
          <article key={check.title} className="card feature">
            <span style={{ fontSize: "2rem" }}>{check.icon}</span>
            <h3>{check.title}</h3>
            <p>{check.description}</p>
          </article>
        ))}
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem", marginTop: "2rem" }}>
        <h2>امنیت سایت خود را همین حالا بررسی کنید</h2>
        <p style={{ marginBottom: "1rem" }}>ارزیابی رایگان است و نیازی به ثبت‌نام ندارد.</p>
        <Link href="/audit" className="button">
          شروع ارزیابی امنیت
        </Link>
      </section>
    </main>
  );
}
