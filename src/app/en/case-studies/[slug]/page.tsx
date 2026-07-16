import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seoMeta";

const caseStudies: Record<string, { title: string; problem: string; findings: string[]; result: string; scoreBefore: number; scoreAfter: number }> = {
  "ecommerce-improvement": {
    title: "E-commerce Site Speed Optimization",
    problem: "Slow loading times causing 40% bounce rate on mobile devices",
    findings: ["Uncompressed images (3MB+ per page)", "No lazy loading", "Render-blocking scripts", "Missing CDN"],
    result: "60% faster load time, 25% increase in mobile conversions, bounce rate dropped to 18%",
    scoreBefore: 35,
    scoreAfter: 78,
  },
  "agency-client-reports": {
    title: "Agency Automates Client Audit Reports",
    problem: "Manual SEO checks taking 4+ hours per client, inconsistent report quality",
    findings: ["No standardized audit process", "Manual data collection", "Inconsistent report format"],
    result: "80% time savings, 3x more clients served, consistent professional reports",
    scoreBefore: 45,
    scoreAfter: 82,
  },
  "wordpress-security": {
    title: "WordPress Security Hardening",
    problem: "Outdated plugins, no CSP headers, exposed admin panel, weak passwords",
    findings: ["5 critical security issues", "No security headers", "Exposed login page", "Outdated PHP"],
    result: "All critical issues fixed, security score improved from 28 to 85",
    scoreBefore: 28,
    scoreAfter: 85,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudies[slug];

  if (!study) {
    return { title: "Case study not found", robots: { index: false, follow: false } };
  }

  return buildPageMetadata({
    locale: "en",
    path: `/case-studies/${slug}`,
    title: study.title,
    description: study.problem,
    type: "article",
    keywords: ["website audit case study", "technical SEO", slug.replaceAll("-", " ")]
  });
}

export default async function EnglishCaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudies[slug];
  if (!study) notFound();

  return (
    <main className="container page-shell">
      <Link href="/en/case-studies" style={{ fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>← Back to case studies</Link>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "1rem" }}>{study.title}</h1>

      <section className="card" style={{ padding: "2rem" }}>
        <h2>Problem</h2>
        <p>{study.problem}</p>
      </section>

      <section className="card" style={{ padding: "2rem" }}>
        <h2>Score Improvement</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "3rem", marginTop: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Before</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#dc2626" }}>{study.scoreBefore}<span style={{ fontSize: "1rem" }}>/100</span></div>
          </div>
          <div style={{ textAlign: "center", fontSize: "2rem", fontWeight: 800, color: "#059669" }}>→</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>After</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#059669" }}>{study.scoreAfter}<span style={{ fontSize: "1rem" }}>/100</span></div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: "2rem" }}>
        <h2>Key Findings</h2>
        <ul>
          {study.findings.map((f, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{f}</li>)}
        </ul>
      </section>

      <section className="card" style={{ padding: "2rem", background: "var(--brand-bg, #f0fdf4)" }}>
        <h2>Result</h2>
        <p style={{ fontWeight: 600 }}>{study.result}</p>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ marginBottom: "1rem" }}>Get a similar audit for your site</p>
        <Link href="/audit" className="button">Start Free Audit</Link>
      </section>
    </main>
  );
}
