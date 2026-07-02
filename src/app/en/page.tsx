import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";
import SeoPageEvent from "../../components/SeoPageEvent";
import IntentRouter from "../../components/IntentRouter";
import HeroAuditForm from "../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/",
  title: "Technical SEO and Security Website Audit",
  description: "Enter your website URL and get an execution-ready report for engineering and growth teams.",
  keywords: ["website audit", "technical SEO", "performance audit", "conversion operations"]
});

export default function HomePageEn() {
  return (
    <main className="landing">
      <SeoPageEvent event="seo_landing_view" params={{ locale: "en", path: "/en" }} />
      <section className="card hero hero-large">
        <span className="badge hero-badge">Execution-ready output for engineering and growth teams</span>
        <h1>Audit your website with actionable output, not just raw issues</h1>
        <p className="hero-lead">
          In minutes, technical SEO, performance, and security issues are prioritized so your team can execute fixes with clarity.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>Clear output for engineering, content, and growth teams</li>
          <li>Risk classification: critical, high, medium</li>
          <li>Usable for a practical 7 to 30 day plan</li>
        </ul>
        <div className="hero-actions">
          <Link className="button" href="/en/audit">
            Start New Audit
          </Link>
          <Link className="button secondary" href="/en/guides">
            Practical Guides
          </Link>
          <Link className="button secondary" href="/en/standards">
            Delivery Standards
          </Link>
          <Link
            className="button secondary"
            href="https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=cross_site&utm_campaign=alireza_safaei_network&utm_content=hero_contact_en"
            target="_blank"
            rel="noopener noreferrer"
          >
            Execution and Consulting
          </Link>
          <Link
            className="button secondary"
            href="https://persiantoolbox.ir/?utm_source=audit&utm_medium=cross_site&utm_campaign=alireza_safaei_network&utm_content=hero_toolbox_en"
            target="_blank"
            rel="noopener noreferrer"
          >
            PersianToolbox Utilities
          </Link>
        </div>
      </section>

      <section className="trust-strip">
        <article>
          <strong>Fast Delivery</strong>
          <p>Request submission and processing starts automatically</p>
        </article>
        <article>
          <strong>Trackable Output</strong>
          <p>Each finding includes a concrete recommended action</p>
        </article>
        <article>
          <strong>Stable Infrastructure</strong>
          <p>Operational path suitable for production teams</p>
        </article>
      </section>

      <IntentRouter locale="en" />

      <section className="kpi-grid">
        <article className="kpi">
          <strong>22/22</strong>
          <p>All done-phase automation checks passing</p>
        </article>
        <article className="kpi">
          <strong>10</strong>
          <p>Operational and documented API routes</p>
        </article>
        <article className="kpi">
          <strong>20+</strong>
          <p>SEO-ready pages in Persian and English</p>
        </article>
        <article className="kpi">
          <strong>4</strong>
          <p>CI pipelines for roadmap, docs, readiness, and main gate</p>
        </article>
      </section>

      <section className="section-head">
        <h2>How does this platform help?</h2>
        <p>From request submission to final report delivery, each step is optimized for practical execution.</p>
      </section>

      <section className="feature-grid">
        <article className="card feature">
          <h3>Core Flows</h3>
          <p>Audit request intake, queue processing, secure report link, and structured handoff for your team.</p>
          <Link href="/en/sample-report">View Sample Report</Link>
        </article>
        <article className="card feature">
          <h3>Operational Tooling</h3>
          <p>Roadmap automation, docs generation, payment preflight, and production readiness workflow are integrated.</p>
          <Link href="/en/pillar/iran-readiness-audit">Read Audit Framework</Link>
          <Link href="/en/standards">Output Definition and Intent Map</Link>
        </article>
      </section>
    </main>
  );
}
