import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";
import AuditCtaLink from "../../components/AuditCtaLink";
import SeoPageEvent from "../../components/SeoPageEvent";
import IntentRouter from "../../components/IntentRouter";
import HeroAuditForm from "../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/",
  title: "Technical SEO and Security Website Audit",
  description: "Enter a public website URL to review the checks that can be measured, their coverage, prioritized findings, and practical next steps.",
  keywords: ["website audit", "technical SEO", "performance audit", "conversion operations"]
});

export default function HomePageEn() {
  return (
    <main className="landing">
      <SeoPageEvent event="seo_landing_view" params={{ locale: "en", path: "/en" }} />
      <section className="card hero hero-large">
        <span className="badge hero-badge">Prioritized findings with measured coverage</span>
        <h1>See what needs attention on your website</h1>
        <p className="hero-lead">
          Enter a public website address. The report describes only checks that actually ran and keeps unavailable or unmeasured areas separate from confirmed findings.
        </p>
        <HeroAuditForm locale="en" />
        <ul className="hero-checklist">
          <li>Prioritized findings in plain language</li>
          <li>Clear coverage and limitations for each check</li>
          <li>Practical next steps for issues that were observed</li>
        </ul>
        <div className="hero-actions">
          <Link className="button secondary" href="/en/qualification">
            Request specialist review
          </Link>
          <AuditCtaLink ctaId="audit_landing_sample_report" locale="en" />
        </div>
      </section>

      <section className="trust-strip" aria-label="Report scope and limitations">
        <article>
          <strong>Measured coverage</strong>
          <p>The report identifies which checks ran and which areas were unavailable or unmeasured.</p>
        </article>
        <article>
          <strong>Prioritized findings</strong>
          <p>Observed issues are ordered so the most important follow-up is easier to identify.</p>
        </article>
        <article>
          <strong>Clear limits</strong>
          <p>Automated checks provide evidence for what they can measure; they do not guarantee complete security or coverage.</p>
        </article>
      </section>

      <IntentRouter locale="en" />

      <section className="section-head">
        <h2>Choose the level of review you need</h2>
        <p>Start with an automated audit, inspect a sample output, or request a separate specialist review when automated evidence is not enough.</p>
      </section>

      <section className="feature-grid">
        <article className="card feature">
          <h3>Automated audit</h3>
          <p>Run the available technical checks, see measured coverage, and review prioritized findings with practical follow-up guidance.</p>
          <AuditCtaLink ctaId="audit_landing_sample_report" locale="en" />
        </article>
        <article className="card feature">
          <h3>Specialist review</h3>
          <p>When automated evidence is not sufficient for your decision, submit a separate request for human review and scope clarification.</p>
          <Link href="/en/qualification">Request specialist review</Link>
          <Link href="/en/standards">Read output definitions and audit standards</Link>
        </article>
      </section>
    </main>
  );
}
