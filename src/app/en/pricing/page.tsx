import Link from "next/link";
import type { Metadata } from "next";
import AuditCtaLink from "../../../components/AuditCtaLink";
import { buildPageMetadata } from "../../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/en/pricing",
  title: "Pricing - Website Audit Plans",
  description: "Three tiers of website audit: Free, Professional, and Enterprise. Transparent pricing with money-back guarantee.",
  keywords: ["audit pricing", "website audit cost", "seo audit price"],
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
    name: "Free Report",
    price: "Free",
    period: "",
    description: "Get started with your site health",
    features: [
      "Automated website audit",
      "Top 5 issues identified",
      "Overall score out of 100",
      "Priority guide",
      "Instant delivery",
    ],
    cta: "Start Free",
    ctaHref: "/en/audit",
  },
  {
    name: "Full Report",
    price: "$9",
    period: "",
    description: "For technical teams and product managers",
    features: [
      "Everything in Free Report",
      "All technical & security issues",
      "Step-by-step execution guide",
      "Impact-based prioritization",
      "Printable PDF report",
      "7-day support",
    ],
    highlighted: true,
    cta: "Buy Full Report",
    ctaHref: "/en/audit",
  },
  {
    name: "Expert Consultation",
    price: "$19",
    period: "",
    description: "For businesses serious about growth",
    features: [
      "Everything in Full Report",
      "30-minute consultation call",
      "Personalized site review",
      "Custom action plan",
      "30-day follow-up",
      "Priority support",
    ],
    cta: "Book Consultation",
    ctaHref: "/en/audit",
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

export default function PricingPageEn() {
  return (
    <main className="container page-shell">
      <section className="section-head">
        <h1>Simple, Transparent Pricing</h1>
        <p>Start with a free audit, then upgrade when you need more.</p>
      </section>

      <section className="pricing-grid">
        {tiers.map((tier) => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </section>

      <section className="card pricing-faq">
        <h2>Pricing FAQ</h2>
        <div className="pricing-faq-grid">
          <div className="pricing-faq-item">
            <h4>Is the free audit really free?</h4>
            <p>Yes. The free audit requires no registration or payment information.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>What is the difference between free and full reports?</h4>
            <p>The free report shows top 5 issues. The full report includes all issues with step-by-step execution guides.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>Is there a money-back guarantee?</h4>
            <p>Yes. Within 7 days of purchase, if you are not satisfied, a full refund is issued.</p>
          </div>
          <div className="pricing-faq-item">
            <h4>What does expert consultation include?</h4>
            <p>30-minute video call, personalized site review, custom action plan, and 30-day follow-up.</p>
          </div>
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Not sure yet?</h2>
        <p style={{ marginBottom: "1rem" }}>
          Review the sample report or start a free assessment on your own site.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center", marginBottom: "1.5rem" }}>
          <AuditCtaLink ctaId="pricing_page_sample_report" locale="en" />
          <AuditCtaLink ctaId="pricing_page_audit_start" locale="en" />
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Still have questions?</h2>
        <p style={{ marginBottom: "1rem" }}>Contact us and we will recommend the best plan for your needs.</p>
        <Link href="mailto:team@alirezasafaeisystems.ir" className="button">
          Send Message
        </Link>
      </section>
    </main>
  );
}
