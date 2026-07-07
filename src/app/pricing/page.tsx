import Link from "next/link";
import type { Metadata } from "next";
import AuditCtaLink from "../../components/AuditCtaLink";
import { buildPageMetadata } from "../../lib/seoMeta";
import { PLANS, formatPriceToman } from "../../lib/plans";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/pricing",
  title: "قیمت‌گذاری اشتراک سیستم ممیزی",
  description: "چهار سطح اشتراک: رایگان، استارتر، پرو و آژانس. پایش سئو، عملکرد و امنیت وب‌سایت با قیمت‌گذاری شفاف ماهانه.",
  keywords: ["قیمت اشتراک سایت", "هزینه پایش سئو", "قیمت ممیزی فنی", "audit subscription pricing", "پایش مستمر سایت"],
});

const planDetails = [
  {
    code: "free" as const,
    badge: null as string | null,
    features: [
      "پایش خودکار سایت",
      "۱ پروژه",
      "۳ ممیزی در ماه",
      "گزارش مشکلات اصلی",
      "امتیاز کلی از ۱۰۰",
    ],
    cta: "شروع رایگان",
    ctaHref: "/signup",
  },
  {
    code: "starter" as const,
    badge: null as string | null,
    features: [
      "همه موارد رایگان",
      "۳ پروژه",
      "۲۰ ممیزی در ماه",
      "گزارش کامل با تمام مشکلات",
      "خروجی PDF",
      "پشتیبانی ایمیلی",
    ],
    cta: "خرید استارتر",
    ctaHref: "/signup",
  },
  {
    code: "pro" as const,
    badge: "محبوب‌ترین",
    features: [
      "همه موارد استارتر",
      "۱۰ پروژه",
      "۱۰۰ ممیزی در ماه",
      "ممیزی زمان‌بندی شده هفتگی/ماهانه",
      "خروجی PDF",
      "پشتیبانی اولویت‌دار",
    ],
    cta: "خرید پرو",
    ctaHref: "/signup",
  },
  {
    code: "agency" as const,
    badge: null as string | null,
    features: [
      "همه موارد پرو",
      "۵۰ پروژه",
      "۵۰۰ ممیزی در ماه",
      "ممیزی زمان‌بندی شده",
      "خروجی PDF",
      "پشتیبانی اختصاصی",
    ],
    cta: "تماس با ما",
    ctaHref: "mailto:team@alirezasafaeisystems.ir",
  },
];

export default function PricingPage() {
  return (
    <main className="container page-shell">
      <section className="section-head">
        <h1>قیمت‌گذاری ساده و شفاف</h1>
        <p>از پایش رایگان شروع کنید و متناسب با رشد کسب‌وکارتان ارتقا دهید.</p>
      </section>

      <section className="pricing-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {planDetails.map((plan) => {
          const planConfig = PLANS[plan.code];
          const isPopular = plan.code === "pro";
          return (
            <article key={plan.code} className={`pricing-card ${isPopular ? "pricing-highlighted" : ""}`}>
              <div className="pricing-header">
                {plan.badge && <span className="badge" style={{ background: "var(--brand)", color: "#fff", marginBottom: "0.5rem" }}>{plan.badge}</span>}
                <h3 className="pricing-name">{planConfig.name}</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">{formatPriceToman(planConfig.priceMonthlyToman)}</span>
                  {planConfig.priceMonthlyToman > 0 && <span className="pricing-period">/ماه</span>}
                </div>
                <p className="pricing-description">{planConfig.billingNote}</p>
              </div>
              <ul className="pricing-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <span className="pricing-check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="pricing-action">
                <Link href={plan.ctaHref} className={`button ${isPopular ? "" : "secondary"}`}>
                  {plan.cta}
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>جدول مقایسه ویژگی‌ها</h2>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>ویژگی</th>
              <th>رایگان</th>
              <th>استارتر</th>
              <th>پرو</th>
              <th>آژانس</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>قیمت ماهانه</td>
              <td>رایگان</td>
              <td>{formatPriceToman(PLANS.starter.priceMonthlyToman)}</td>
              <td>{formatPriceToman(PLANS.pro.priceMonthlyToman)}</td>
              <td>{formatPriceToman(PLANS.agency.priceMonthlyToman)}</td>
            </tr>
            <tr>
              <td>پروژه‌ها</td>
              <td>{PLANS.free.projectLimit}</td>
              <td>{PLANS.starter.projectLimit}</td>
              <td>{PLANS.pro.projectLimit}</td>
              <td>{PLANS.agency.projectLimit}</td>
            </tr>
            <tr>
              <td>ممیزی در ماه</td>
              <td>{PLANS.free.monthlyAuditLimit}</td>
              <td>{PLANS.starter.monthlyAuditLimit}</td>
              <td>{PLANS.pro.monthlyAuditLimit}</td>
              <td>{PLANS.agency.monthlyAuditLimit}</td>
            </tr>
            <tr>
              <td>خروجی PDF</td>
              <td>—</td>
              <td>✓</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>ممیزی زمان‌بندی شده</td>
              <td>—</td>
              <td>—</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>پشتیبانی</td>
              <td>—</td>
              <td>ایمیلی</td>
              <td>اولویت‌دار</td>
              <td>اختصاصی</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card pricing-faq">
        <h2>سوالات متداول درباره قیمت</h2>
        <div className="pricing-faq-grid">
          <div className="pricing-faq-item">
            <h4>آیا پایش اولیه واقعاً رایگان است؟</h4>
            <p>بله. با پلن رایگان می‌توانید ۱ پروژه و ۳ ممیزی در ماه داشته باشید بدون هیچ هزینه‌ای.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>تفاوت پلن‌های مختلف چیست؟</h4>
            <p>هر پلن تعداد پروژه‌ها، ممیزی‌های ماهانه و امکاناتی مثل PDF و ممیزی زمان‌بندی شده را افزایش می‌دهد.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>آیا می‌توانم هر زمان اشتراک را لغو کنم؟</h4>
            <p>بله. اشتراک شما ماهانه تمدید می‌شود و هر زمان می‌توانید آن را لغو کنید.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>ممیزی زمان‌بندی شده چیست؟</h4>
            <p>با پلن پرو و بالاتر، می‌توانید ممیزی خودکار هفتگی یا ماهانه را برای پروژه‌هایتان فعال کنید.</p>
          </div>
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>هنوز مطمئن نیستید؟</h2>
        <p style={{ marginBottom: "1rem" }}>
          نمونه گزارش را ببینید یا یک ارزیابی رایگان روی سایت خودتان شروع کنید.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center", marginBottom: "1.5rem" }}>
          <AuditCtaLink ctaId="pricing_page_sample_report" locale="fa" />
          <AuditCtaLink ctaId="pricing_page_audit_start" locale="fa" />
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>نیاز به پلن اختصاصی دارید؟</h2>
        <p style={{ marginBottom: "1rem" }}>برای سازمان‌ها و تیم‌های بزرگ، پلن اختصاصی با امکانات ویژه ارائه می‌دهیم.</p>
        <Link href="mailto:team@alirezasafaeisystems.ir" className="button">
          تماس با ما
        </Link>
      </section>
    </main>
  );
}
