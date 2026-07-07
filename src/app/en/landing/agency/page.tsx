import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../../lib/seoMeta";
import { PLANS, formatPriceToman } from "../../../../lib/plans";
import AuditCtaLink from "../../../../components/AuditCtaLink";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/en/landing/agency",
  title: "Website Audit Platform for Agencies - White-Label Reports & PDF",
  description: "White-label technical website audit platform for agencies. 50 projects, 500 monthly audits, professional PDF reports, scheduled monitoring, and dedicated support.",
  keywords: ["agency audit platform", "white label seo audit", "agency website audit", "PDF audit reports", "client monitoring", "agency seo tool"],
});

const benefits = [
  {
    icon: "🏷️",
    title: "Your Agency Brand",
    description: "Reports and dashboard display your agency logo and visual identity. Your clients see your brand name on every page.",
  },
  {
    icon: "📋",
    title: "Professional PDF Reports",
    description: "Professionally designed PDF reports with your agency branding, ready to deliver to clients. No redesign needed.",
  },
  {
    icon: "👥",
    title: "Multi-Client Management",
    description: "Manage up to 50 client projects in one dashboard. Each project is independent with separate data and reports.",
  },
  {
    icon: "🔄",
    title: "Monthly Monitoring",
    description: "Automated weekly or monthly audits for client projects. Identify new issues and changes on time.",
  },
  {
    icon: "📊",
    title: "All Checks in One Place",
    description: "Technical SEO, speed, security, and performance all in one comprehensive report. No need for multiple tools.",
  },
  {
    icon: "💰",
    title: "Cost Savings",
    description: "Cover all your clients' audit needs with one subscription instead of purchasing separate tools.",
  },
];

const features = [
  {
    icon: "📑",
    title: "PDF Output with Your Brand",
    description: "Each audit report is converted to a professional PDF with your agency logo and visual identity. Clients see your name on every page.",
  },
  {
    icon: "📈",
    title: "Automated Weekly/Monthly Audits",
    description: "Schedule automated audits for each client project. Track changes in rankings, speed, and security.",
  },
  {
    icon: "🏢",
    title: "50 Client Projects",
    description: "Create up to 50 separate projects for different clients. Each project has independent settings and reports.",
  },
  {
    icon: "⚡",
    title: "500 Monthly Audits",
    description: "High monthly audit volume to cover all agency clients. No limits on the number of checks.",
  },
];

const steps = [
  { step: "1", title: "Activate agency subscription", description: "Select the agency plan and activate your subscription." },
  { step: "2", title: "Add client projects", description: "Enter each client's website URL and configure audit settings." },
  { step: "3", title: "Deliver PDF reports", description: "Deliver professional reports with your brand to your clients." },
];

const faqItems = [
  {
    q: "Are reports generated with my agency brand?",
    a: "Yes. All PDF reports are designed with your agency logo and visual identity. Your clients see your brand name on every page of the report.",
  },
  {
    q: "How many projects and audits are included?",
    a: "The agency plan includes 50 client projects and 500 monthly audits. This is sufficient for most agencies.",
  },
  {
    q: "Are audits automated?",
    a: "Yes. You can schedule automated weekly or monthly audits for each client project. No manual execution needed.",
  },
  {
    q: "Can I change the number of projects?",
    a: "For more than 50 projects, contact our team. We offer custom plans for large agencies.",
  },
  {
    q: "Do I get dedicated support?",
    a: "Yes. Agencies receive priority dedicated support. Our team is ready to answer your questions and resolve issues quickly.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. With the free plan, you can have 1 project and 3 audits per month to test report quality.",
  },
];

export default function AgencyLandingEn() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">Agency Audit Platform</span>
        <h1>Professional Audit Reports with Your Agency Brand</h1>
        <p className="hero-lead">
          White-label technical website audit platform with professional PDF reports and scheduled monitoring for managing multiple client projects.
        </p>
        <div className="hero-actions">
          <Link href="/en/signup?plan=agency" className="button">
            Start with Agency Plan
          </Link>
          <Link href="/en/pricing" className="button secondary">
            View Pricing Details
          </Link>
        </div>
        <ul className="hero-checklist">
          <li>Your agency brand identity</li>
          <li>Up to 50 client projects</li>
          <li>Professional PDF reports</li>
          <li>Automated monthly monitoring</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>Why agencies need a dedicated audit platform</h2>
        <p>Professional reports with your brand increase client trust and retention.</p>
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
        <h2>Agency Plan Features</h2>
        <p>Everything you need to manage client audits efficiently.</p>
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
        <h2>Agency Plan Pricing</h2>
        <div style={{ fontSize: "2rem", color: "var(--brand)", fontWeight: "bold", margin: "1rem 0" }}>
          {formatPriceToman(PLANS.agency.priceMonthlyToman)} / month
        </div>
        <p style={{ marginBottom: "1rem" }}>
          Includes {PLANS.agency.projectLimit} client projects, {PLANS.agency.monthlyAuditLimit} monthly audits, PDF export, and dedicated support.
        </p>
        <Link href="/en/signup?plan=agency" className="button">
          Purchase Agency Subscription
        </Link>
      </section>

      <section className="section-head">
        <h2>Just 3 steps to get started</h2>
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
        <h2>See a sample report</h2>
        <p style={{ marginBottom: "1rem" }}>
          Check the quality of our PDF reports before purchasing.
        </p>
        <div className="hero-actions">
          <AuditCtaLink ctaId="agency_landing_sample_report" locale="en" />
          <AuditCtaLink ctaId="agency_landing_audit_start" locale="en" />
        </div>
      </section>

      <section className="card pricing-faq" style={{ marginTop: "2rem" }}>
        <h2>Frequently Asked Questions for Agencies</h2>
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
        <h2>Have questions? Contact us</h2>
        <p style={{ marginBottom: "1rem" }}>
          For a free consultation and more information about the agency plan, get in touch with our team.
        </p>
        <Link href="mailto:team@alirezasafaeisystems.ir" className="button secondary">
          Send Email
        </Link>
      </section>
    </main>
  );
}
