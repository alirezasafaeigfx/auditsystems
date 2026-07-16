import type { Metadata } from "next";
import Link from "next/link";
import { toAbsoluteUrl } from "../../lib/site";

export const metadata: Metadata = {
  title: "Audit Readiness Checklist",
  description: "Prepare your website for a technical, SEO, security, accessibility, and performance audit.",
  alternates: {
    canonical: toAbsoluteUrl("/audit-readiness")
  }
};

export default function AuditReadinessPage() {
  return (
    <main className="container page-shell">
      <section className="section-head">
        <h1>Audit Readiness Checklist</h1>
        <p>Is your website ready for a technical audit? Check these items before you start.</p>
      </section>

      <section className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Before You Audit</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            "Your website is live and accessible to the public internet",
            "You know the exact URL you want audited (e.g., https://example.com)",
            "Your website loads without critical errors",
            "You have a staging or production environment available",
            "You are ready to act on the findings",
          ].map((item, i) => (
            <li key={i} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border, #e5e7eb)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ color: "var(--brand, #059669)", fontWeight: 700 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>What We Check</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            { title: "Technical SEO", desc: "Meta tags, structured data, crawlability" },
            { title: "Performance", desc: "Load times, Core Web Vitals, optimization" },
            { title: "Security", desc: "Headers, vulnerabilities, best practices" },
            { title: "Accessibility", desc: "WCAG compliance, screen reader support" },
            { title: "UX Quality", desc: "Mobile, navigation, error handling" },
            { title: "Reliability", desc: "Uptime, SSL, error rates" },
          ].map((item, i) => (
            <div key={i} style={{ padding: "1rem", background: "var(--surface, #f9fafb)", borderRadius: "0.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem" }}>{item.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Ready to Start?</h2>
        <p style={{ marginBottom: "1rem", color: "var(--muted, #6b7280)" }}>Enter your URL and get a comprehensive audit report in under 2 minutes.</p>
        <Link href="/audit" className="button" style={{ fontSize: "1.125rem", padding: "1rem 2rem" }}>Start Free Audit</Link>
      </section>
    </main>
  );
}
