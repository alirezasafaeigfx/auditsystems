import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/pricing",
  title: "قیمت‌گذاری - سطوح ارزیابی سایت",
  description: "سه سطح ارزیابی سایت: رایگان، حرفه‌ای و سازمانی. قیمت‌گذاری شفاف و بازگشت وجه.",
  keywords: ["قیمت ارزیابی سایت", "هزینه سئو", "قیمت ممیزی فنی", "audit pricing"],
});

type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
};

const tiers: PricingTier[] = [
  {
    name: "گزارش اولیه",
    price: "رایگان",
    period: "",
    description: "برای آشنایی با وضعیت سایتتان",
    features: [
      "ارزیابی خودکار سایت",
      "۵ مشکل اصلی",
      "امتیاز کلی از ۱۰۰",
      "راهنمای اولویت‌بندی",
      "تحویل فوری",
    ],
    cta: "شروع رایگان",
    ctaHref: "/audit",
  },
  {
    name: "گزارش کامل",
    price: "۲۹۹,۰۰۰",
    period: "تومان",
    description: "برای تیم‌های فنی و مدیران محصول",
    features: [
      "همه موارد گزارش اولیه",
      "تمام مشکلات فنی و امنیتی",
      "راهنمای اجرای گام به گام",
      "اولویت‌بندی بر اساس تاثیر",
      "گزارش PDF قابل چاپ",
      "پشتیبانی ۷ روزه",
    ],
    highlighted: true,
    cta: "خرید گزارش کامل",
    ctaHref: "/audit",
  },
  {
    name: "مشاوره تخصصی",
    price: "۵۹۹,۰۰۰",
    period: "تومان",
    description: "برای کسب‌وکارهای جدی در رشد",
    features: [
      "همه موارد گزارش کامل",
      "جلسه ۳۰ دقیقه‌ای مشاوره",
      "بررسی اختصاصی سایت شما",
      "طرح اقدام شخصی‌سازی شده",
      "پیگیری ۳۰ روزه",
      "اولویت در پشتیبانی",
    ],
    cta: "رزرو مشاوره",
    ctaHref: "/audit",
  },
];

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <article className={`pricing-card ${tier.highlighted ? "pricing-highlighted" : ""}`}>
      <div className="pricing-header">
        <h3 className="pricing-name">{tier.name}</h3>
        <div className="pricing-price">
          <span className="pricing-amount">{tier.price}</span>
          {tier.period && <span className="pricing-period">{tier.period}</span>}
        </div>
        <p className="pricing-description">{tier.description}</p>
      </div>
      <ul className="pricing-features">
        {tier.features.map((feature, i) => (
          <li key={i}>
            <span className="pricing-check">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <div className="pricing-action">
        <Link href={tier.ctaHref} className={`button ${tier.highlighted ? "" : "secondary"}`}>
          {tier.cta}
        </Link>
      </div>
    </article>
  );
}

export default function PricingPage() {
  return (
    <main className="container page-shell">
      <section className="section-head">
        <h1>قیمت‌گذاری ساده و شفاف</h1>
        <p>از ارزیابی رایگان شروع کنید و در صورت نیاز، سرویس پیشرفته‌تر دریافت کنید.</p>
      </section>

      <section className="pricing-grid">
        {tiers.map((tier) => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>جدول مقایسه ویژگی‌ها</h2>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>ویژگی</th>
              <th>گزارش اولیه</th>
              <th>گزارش کامل</th>
              <th>مشاوره تخصصی</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ارزیابی خودکار سایت</td>
              <td>✓</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>تعداد مشکلات</td>
              <td>۵ مشکل</td>
              <td>نامحدود</td>
              <td>نامحدود</td>
            </tr>
            <tr>
              <td>امتیاز کلی</td>
              <td>✓</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>راهنمای اجرای گام به گام</td>
              <td>—</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>گزارش PDF</td>
              <td>—</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>جلسه مشاوره</td>
              <td>—</td>
              <td>—</td>
              <td>۳۰ دقیقه</td>
            </tr>
            <tr>
              <td>طرح اقدام شخصی</td>
              <td>—</td>
              <td>—</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>پیگیری</td>
              <td>—</td>
              <td>۷ روز</td>
              <td>۳۰ روز</td>
            </tr>
            <tr>
              <td>قیمت</td>
              <td>رایگان</td>
              <td>۲۹۹,۰۰۰ تومان</td>
              <td>۵۹۹,۰۰۰ تومان</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card pricing-faq">
        <h2>سوالات متداول درباره قیمت</h2>
        <div className="pricing-faq-grid">
          <div className="pricing-faq-item">
            <h4>آیا ارزیابی اولیه واقعاً رایگان است؟</h4>
            <p>بله. ارزیابی اولیه کاملاً رایگان است و نیازی به ثبت‌نام یا وارد کردن اطلاعات پرداخت ندارد.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>تفاوت گزارش رایگان و کامل چیست؟</h4>
            <p>گزارش رایگان ۵ مشکل اصلی را نشان می‌دهد. گزارش کامل تمام مشکلات را با راهنمای اجرای گام به گام ارائه می‌دهد.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>آیا امکان بازگشت وجه وجود دارد؟</h4>
            <p>بله. تا ۷ روز پس از خرید، در صورت عدم رضایت، وجه کامل بازگردانده می‌شود.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>مشاوره تخصصی شامل چه مواردی است؟</h4>
            <p>جلسه ۳۰ دقیقه‌ای ویدیویی، بررسی اختصاصی سایت، طرح اقدام شخصی و پیگیری ۳۰ روزه.</p>
          </div>
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>هنوز سوال دارید؟</h2>
        <p style={{ marginBottom: "1rem" }}>با ما تماس بگیرید تا بهترین پلن را برای نیاز شما پیشنهاد دهیم.</p>
        <Link href="mailto:team@alirezasafaeisystems.ir" className="button">
          ارسال پیام
        </Link>
      </section>
    </main>
  );
}
