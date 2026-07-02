import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../../lib/seoMeta";
import HeroAuditForm from "../../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/en/landing/security-audit",
  title: "Website Security Audit - Free Vulnerability Check",
  description: "Free website security audit covering headers, HTTPS, XSS, CSRF, and data protection.",
  keywords: ["website security audit", "vulnerability check", "security scan", "site security"],
});

const securityChecks = [
  { icon: "🔒", title: "Security Headers", description: "Check CSP, HSTS, X-Frame-Options and other security headers" },
  { icon: "🛡️", title: "SSL Certificate", description: "Validate HTTPS certificate and configuration" },
  { icon: "🔐", title: "XSS Protection", description: "Check for Cross-Site Scripting vulnerabilities" },
  { icon: "🔑", title: "CSRF Protection", description: "Verify Cross-Site Request Forgery protections" },
  { icon: "📦", title: "Cookie Security", description: "Review Secure, HttpOnly and SameSite cookie settings" },
  { icon: "🕵️", title: "Privacy", description: "Check user data collection and storage practices" },
];

export default function SecurityAuditLandingEn() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">Free Security Audit</span>
        <h1>How secure is your website against attacks?</h1>
        <p className="hero-lead">
          Discover your website vulnerabilities with a free security audit and prevent attacks.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>Complete security headers check</li>
          <li>Common vulnerability analysis</li>
          <li>Security fix guide</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>What gets checked?</h2>
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
        <h2>Check your website security now</h2>
        <p style={{ marginBottom: "1rem" }}>The audit is free and requires no registration.</p>
        <Link href="/en/audit" className="button">
          Start Security Audit
        </Link>
      </section>
    </main>
  );
}
