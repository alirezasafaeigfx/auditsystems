import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seoMeta";
import { PLANS, formatPriceToman } from "../../../lib/plans";
import AuditCtaLink from "../../../components/AuditCtaLink";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/landing/agency",
  title: "پلتفرم ممیزی وب‌سایت برای آژانس‌ها - برند اختصاصی و گزارش PDF",
  description: "پلتفرم ممیزی فنی وب‌سایت با برند اختصاصی آژانس شما. ۵۰ پروژه، ۵۰۰ ممیزی ماهانه، گزارش PDF حرفه‌ای، پایش مستمر و پشتیبانی اختصاصی.",
  keywords: ["پلتفرم ممیزی آژانس", "ممیزی سئو برای آژانس", "white label audit", "گزارش PDF ممیزی", "پایش سئو مشتریان", "Agency SEO audit platform"],
});

const benefits = [
  {
    icon: "🏷️",
    title: "برند اختصاصی آژانس شما",
    description: "گزارش‌ها و پنل با لوگو و هویت بصری آژانس شما نمایش داده می‌شوند. مشتریان شما نام برند شما را می‌بینند.",
  },
  {
    icon: "📋",
    title: "گزارش PDF حرفه‌ای",
    description: "گزارش‌های PDF با طراحی حرفه‌ای و برند اختصاصی آماده تحویل به مشتریان. بدون نیاز به طراحی مجدد.",
  },
  {
    icon: "👥",
    title: "مدیریت چندین مشتری",
    description: "تا ۵۰ پروژه مشتری را در یک پنل مدیریت کنید. هر پروژه مستقل و با اطلاعات جداگانه.",
  },
  {
    icon: "🔄",
    title: "پایش مستمر ماهانه",
    description: "ممیزی خودکار هفتگی یا ماهانه برای پروژه‌های مشتریان. تغییرات و مشکلات جدید را به‌موقع شناسایی کنید.",
  },
  {
    icon: "📊",
    title: "تمام بررسی‌ها در یک مکان",
    description: "سئو فنی، سرعت، امنیت و عملکرد همه در یک گزارش جامع. نیازی به ابزارهای متعدد نیست.",
  },
  {
    icon: "💰",
    title: "صرفه‌جویی در هزینه",
    description: "به جای خرید ابزارهای جداگانه، تمام نیازهای ممیزی مشتریان را با یک اشتراک پوشش دهید.",
  },
];

const features = [
  {
    icon: "📑",
    title: "خروجی PDF با برند شما",
    description: "هر گزارش ممیزی به PDF حرفه‌ای با لوگو و هویت بصری آژانس شما تبدیل می‌شود. مشتریان نام شما را در هر صفحه می‌بینند.",
  },
  {
    icon: "📈",
    title: "پایش خودکار هفتگی/ماهانه",
    description: "برای هر پروژه مشتری ممیزی خودکار زمان‌بندی کنید. تغییرات رتبه، سرعت و امنیت را پیگیری کنید.",
  },
  {
    icon: "🏢",
    title: "۵۰ پروژه مشتری",
    description: "تا ۵۰ پروژه مجزا برای مشتریان مختلف ایجاد کنید. هر پروژه با تنظیمات و گزارش‌های مستقل.",
  },
  {
    icon: "⚡",
    title: "۵۰۰ ممیزی در ماه",
    description: "حجم بالای ممیزی ماهانه برای پوشش تمام مشتریان آژانس. بدون محدودیت در تعداد بررسی‌ها.",
  },
];

const steps = [
  { step: "۱", title: "اشتراک آژانس فعال کنید", description: "پلن آژانس را انتخاب و اشتراک خود را فعال کنید." },
  { step: "۲", title: "پروژه مشتریان را اضافه کنید", description: "آدرس سایت هر مشتری را وارد کنید و تنظیمات ممیزی را مشخص کنید." },
  { step: "۳", title: "گزارش PDF تحویل دهید", description: "گزارش‌های حرفه‌ای با برند خود را به مشتریان تحویل دهید." },
];

const faqItems = [
  {
    q: "آیا گزارش‌ها با برند آژانس من تولید می‌شوند؟",
    a: "بله. تمام گزارش‌های PDF با لوگو و هویت بصری آژانس شما طراحی می‌شوند. مشتریان شما نام برند شما را در تمام صفحات گزارش مشاهده می‌کنند.",
  },
  {
    q: "تعداد پروژه‌ها و ممیزی‌ها چقدر است؟",
    a: "پلن آژانس شامل ۵۰ پروژه مشتری و ۵۰۰ ممیزی در ماه است. این تعداد برای اکثر آژانس‌ها کافی است.",
  },
  {
    q: "آیا ممیزی خودکار انجام می‌شود؟",
    a: "بله. برای هر پروژه مشتری می‌توانید ممیزی خودکار هفتگی یا ماهانه زمان‌بندی کنید. نیازی به اجرای دستی ممیزی‌ها نیست.",
  },
  {
    q: "آیا امکان تغییر تعداد پروژه‌ها وجود دارد؟",
    a: "برای تعداد پروژه بیشتر از ۵۰، با تیم ما تماس بگیرید. پلن اختصاصی برای آژانس‌های بزرگ ارائه می‌دهیم.",
  },
  {
    q: "آیا پشتیبانی اختصاصی دریافت می‌کنم؟",
    a: "بله. آژانس‌ها از پشتیبانی اختصاصی و سریع‌تر بهره‌مند می‌شوند. تیم ما آماده پاسخگویی به سوالات و مشکلات شماست.",
  },
  {
    q: "آیا امکان آزمایش رایگان وجود دارد؟",
    a: "بله. با پلن رایگان می‌توانید ۱ پروژه و ۳ ممیزی در ماه داشته باشید تا کیفیت گزارش‌ها را بررسی کنید.",
  },
];

export default function AgencyLanding() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">پلتفرم ممیزی اختصاصی آژانس‌ها</span>
        <h1>گزارش‌های حرفه‌ای ممیزی با برند آژانس شما</h1>
        <p className="hero-lead">
          پلتفرم ممیزی فنی وب‌سایت با برند اختصاصی، گزارش PDF حرفه‌ای و پایش مستمر برای مدیریت چندین پروژه مشتری.
        </p>
        <div className="hero-actions">
          <Link href="/signup?plan=agency" className="button">
            شروع با پلن آژانس
          </Link>
          <Link href="/pricing" className="button secondary">
            مشاهده جزئیات قیمت
          </Link>
        </div>
        <ul className="hero-checklist">
          <li>برند اختصاصی آژانس شما</li>
          <li>تا ۵۰ پروژه مشتری</li>
          <li>گزارش PDF حرفه‌ای</li>
          <li>پایش خودکار ماهانه</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>چرا آژانس‌ها به پلتفرم ممیزی اختصاصی نیاز دارند؟</h2>
        <p>ارائه گزارش‌های حرفه‌ای با برند خود، اعتماد مشتریان را افزایش می‌دهد.</p>
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
        <h2>ویژگی‌های پلن آژانس</h2>
        <p>تمام ابزارهایی که برای مدیریت ممیزی مشتریان نیاز دارید.</p>
      </section>

      <section className="feature-grid">
        {features.map((feature) => (
          <article key={feature.title} className="card feature">
            <span style={{ fontSize: "2rem" }}>{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem", marginTop: "2rem" }}>
        <h2>قیمت‌گذاری پلن آژانس</h2>
        <div style={{ fontSize: "2rem", color: "var(--brand)", fontWeight: "bold", margin: "1rem 0" }}>
          {formatPriceToman(PLANS.agency.priceMonthlyToman)} / ماه
        </div>
        <p style={{ marginBottom: "1rem" }}>
          شامل {PLANS.agency.projectLimit} پروژه مشتری، {PLANS.agency.monthlyAuditLimit} ممیزی در ماه، خروجی PDF و پشتیبانی اختصاصی.
        </p>
        <Link href="/signup?plan=agency" className="button">
          خرید اشتراک آژانس
        </Link>
      </section>

      <section className="section-head">
        <h2>فقط ۳ مرحله تا شروع</h2>
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
        <h2>نمونه گزارش را ببینید</h2>
        <p style={{ marginBottom: "1rem" }}>
          قبل از خرید، کیفیت گزارش‌های PDF ما را بررسی کنید.
        </p>
        <div className="hero-actions">
          <AuditCtaLink ctaId="agency_landing_sample_report" locale="fa" />
          <AuditCtaLink ctaId="agency_landing_audit_start" locale="fa" />
        </div>
      </section>

      <section className="card pricing-faq" style={{ marginTop: "2rem" }}>
        <h2>سوالات متداول برای آژانس‌ها</h2>
        <div className="pricing-faq-grid">
          {faqItems.map((item) => (
            <div key={item.q} className="pricing-faq-item">
              <h4>{item.q}</h4>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem", marginTop: "2rem" }}>
        <h2>سوالی دارید؟ با ما تماس بگیرید</h2>
        <p style={{ marginBottom: "1rem" }}>
          برای مشاوره رایگان و اطلاعات بیشتر درباره پلن آژانس، با تیم ما در ارتباط باشید.
        </p>
        <Link href="mailto:team@alirezasafaeisystems.ir" className="button secondary">
          ارسال ایمیل
        </Link>
      </section>
    </main>
  );
}
