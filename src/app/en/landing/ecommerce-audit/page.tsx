import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../../lib/seoMeta";
import HeroAuditForm from "../../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/en/landing/ecommerce-audit",
  title: "Free E-commerce Site Audit - SEO and Performance Check",
  description: "Free SEO, speed, and security audit for your online store. Instant report with actionable fixes.",
  keywords: ["ecommerce audit", "online store seo", "website speed check", "ecommerce optimization"],
});

const benefits = [
  {
    icon: "🔍",
    title: "Find Hidden Issues",
    description: "Product pages without titles, images without alt text, broken links, and technical SEO problems that directly reduce sales.",
  },
  {
    icon: "⚡",
    title: "Speed Optimization",
    description: "Every 1 second of delay = 7% reduction in sales. Optimize your product page load times.",
  },
  {
    icon: "🛡️",
    title: "Payment Security",
    description: "Check payment gateway security, SSL certificates, and customer data protection.",
  },
  {
    icon: "📊",
    title: "Actionable Report",
    description: "Not just a list of problems, but step-by-step solutions for each issue with clear prioritization.",
  },
];

const steps = [
  { step: "1", title: "Enter your website URL", description: "Just enter your store URL in the form below." },
  { step: "2", title: "Automated audit runs", description: "Our system checks your site for technical, SEO, and security issues." },
  { step: "3", title: "Get instant report", description: "See the results immediately and know exactly what to do." },
];

export default function EcommerceAuditLandingEn() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">Free E-commerce Audit</span>
        <h1>What problems does your online store have?</h1>
        <p className="hero-lead">
          With a free audit, discover SEO, speed, and security issues in your store and increase your sales.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>Complete product page evaluation</li>
          <li>Speed and Core Web Vitals check</li>
          <li>Payment gateway security analysis</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>Why does your online store need a technical audit?</h2>
        <p>Technical issues directly impact sales and Google rankings.</p>
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
        <h2>Just 3 steps to your report</h2>
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
        <h2>Get started now</h2>
        <p style={{ marginBottom: "1rem" }}>The audit is free and requires no registration.</p>
        <Link href="/en/audit" className="button">
          Start Free Audit
        </Link>
      </section>
    </main>
  );
}
