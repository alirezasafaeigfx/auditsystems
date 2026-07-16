import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/case-studies",
  title: "Website Audit Case Studies",
  description: "Examples of technical SEO, security, and performance audit outcomes.",
  keywords: ["website audit case studies", "technical SEO results", "security audit", "web performance"]
});

export default function EnglishCaseStudiesPage() {
  const caseStudies = [
    {
      slug: "ecommerce-improvement",
      title: "E-commerce Site Speed Optimization",
      problem: "Slow loading times causing 40% bounce rate",
      result: "60% faster load time, 25% more conversions",
    },
    {
      slug: "agency-client-reports",
      title: "Agency Automates Client Audit Reports",
      problem: "Manual SEO checks taking 4+ hours per client",
      result: "80% time savings, 3x more clients served",
    },
    {
      slug: "wordpress-security",
      title: "WordPress Security Hardening",
      problem: "Outdated plugins, no CSP headers, exposed admin",
      result: "All critical issues fixed, score improved from 28 to 85",
    },
  ];

  return (
    <main className="container page-shell">
      <section className="section-head">
        <h1>Case Studies</h1>
        <p>Real results from ASDEV Audit users.</p>
      </section>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {caseStudies.map((cs) => (
          <article key={cs.slug} className="card" style={{ padding: "1.5rem" }}>
            <Link href={`/en/case-studies/${cs.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>{cs.title}</h2>
              <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                <strong>Problem:</strong> {cs.problem}
              </p>
              <p style={{ color: "var(--brand, #059669)", fontSize: "0.875rem", fontWeight: 600 }}>
                Result: {cs.result}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
