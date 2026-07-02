import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/sample-report",
  title: "Sample Technical Site Audit Report",
  description: "Real example of a technical site audit report covering security, SEO, performance, and accessibility findings with actionable recommendations.",
  keywords: ["sample audit report", "technical SEO report sample", "site audit", "web performance"]
});

type SampleFinding = {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  effort: string;
};

const sampleFindings: SampleFinding[] = [
  {
    code: "NO_CSP_HEADER",
    severity: "CRITICAL",
    category: "Security",
    title: "Content-Security-Policy header is missing",
    description: "Your site does not send a CSP header. This leaves the site vulnerable to XSS attacks.",
    recommendation: "Implement a Content-Security-Policy header with appropriate policies. Start with report-only mode, then switch to enforcing mode.",
    impact: "High",
    effort: "Medium",
  },
  {
    code: "NO_HSTS",
    severity: "HIGH",
    category: "Security",
    title: "HSTS header is missing",
    description: "The HTTP Strict-Transport-Security header is not configured. Browsers may not enforce HTTPS connections.",
    recommendation: "Add the Strict-Transport-Security header with an appropriate max-age value (at least one year).",
    impact: "High",
    effort: "Low",
  },
  {
    code: "THIRD_PARTY_FONTS",
    severity: "MEDIUM",
    category: "Resilience",
    title: "3 fonts loaded from third-party servers",
    description: "Google Fonts are loaded from an external CDN. If the CDN is blocked, fonts won't display.",
    recommendation: "Self-host fonts or use a fallback stack so alternative fonts display when the primary fails to load.",
    impact: "Medium",
    effort: "Medium",
  },
  {
    code: "CWV_LCP_POOR_PROXY",
    severity: "HIGH",
    category: "Performance",
    title: "High LCP: over 4 seconds",
    description: "The Largest Contentful Paint takes over 4 seconds to load. This negatively impacts user experience and SEO ranking.",
    recommendation: "Optimize above-the-fold images, add preload for LCP element, and enable lazy loading for non-critical images.",
    impact: "High",
    effort: "Medium",
  },
  {
    code: "IMG_MISSING_ALT",
    severity: "MEDIUM",
    category: "Accessibility",
    title: "7 images are missing alt text",
    description: "Images without alt text are inaccessible to screen reader users and negatively affect accessibility scores.",
    recommendation: "Add descriptive alt text to all meaningful images. Use empty alt attributes for decorative images.",
    impact: "Medium",
    effort: "Low",
  },
  {
    code: "STATIC_ASSETS_NO_LONG_CACHE",
    severity: "LOW",
    category: "Performance",
    title: "Static assets lack long-term cache headers",
    description: "CSS and JS files are served with short cache headers, causing re-download on every request.",
    recommendation: "Set long cache-max-age headers (at least one year) for versioned static files.",
    impact: "Low",
    effort: "Low",
  },
];

function severityBadge(severity: string): string {
  if (severity === "CRITICAL") return "sev-critical";
  if (severity === "HIGH") return "sev-high";
  if (severity === "MEDIUM") return "sev-medium";
  return "";
}

const overallScore = 58;
const scoreGrade = "D";

const securityHeaders = [
  { name: "Content-Security-Policy", status: "missing" as const },
  { name: "Strict-Transport-Security", status: "missing" as const },
  { name: "X-Content-Type-Options", status: "present" as const },
  { name: "Referrer-Policy", status: "present" as const },
  { name: "Permissions-Policy", status: "missing" as const },
];

const seoBasics = [
  { name: "Page title", status: "present" as const },
  { name: "Meta description", status: "present" as const },
  { name: "Canonical URL", status: "missing" as const },
  { name: "Open Graph", status: "missing" as const },
];

export default function SampleReportPageEn() {
  return (
    <main>
      <section className="card hero">
        <h1>Sample Technical Audit Report</h1>
        <p>
          This is a real example of a technical site audit report. The report covers security, performance,
          SEO, and accessibility findings with actionable recommendations.
        </p>
        <div className="hero-actions">
          <span className="badge">Sample - anonymous-example.ir</span>
          <Link className="button secondary" href="/en/audit">
            Start your own audit
          </Link>
        </div>
      </section>

      <section className="card grid">
        <h2>Audit Summary</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.8rem" }}>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Overall Score</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--danger)" }}>{overallScore}<span style={{ fontSize: "1rem" }}>/100</span></div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--danger)" }}>Grade: {scoreGrade}</div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Total Findings</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{sampleFindings.length}</div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Critical</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
              {sampleFindings.filter(f => f.severity === "CRITICAL").length}
            </div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>High</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
              {sampleFindings.filter(f => f.severity === "HIGH").length}
            </div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Medium</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warn)" }}>
              {sampleFindings.filter(f => f.severity === "MEDIUM").length}
            </div>
          </div>
        </div>
      </section>

      <section className="card grid">
        <h2>Security Headers</h2>
        <div className="grid" style={{ gap: "0.5rem" }}>
          {securityHeaders.map((header) => (
            <div key={header.name} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span style={{ fontWeight: 600 }}>{header.name}</span>
              <span className={`badge ${header.status === "missing" ? "sev-high" : ""}`}>
                {header.status === "present" ? "Present" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid">
        <h2>SEO Status</h2>
        <div className="grid" style={{ gap: "0.5rem" }}>
          {seoBasics.map((item) => (
            <div key={item.name} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
              <span className={`badge ${item.status === "missing" ? "sev-medium" : ""}`}>
                {item.status === "present" ? "Present" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid">
        <h2>Findings ({sampleFindings.length})</h2>
        {sampleFindings.map((finding) => (
          <article key={finding.code} className="finding">
            <div className="finding-header">
              <strong>{finding.code}</strong>
              <span className={`badge ${severityBadge(finding.severity)}`}><span className="sr-only">Severity: </span>{finding.severity}</span>
            </div>
            <h3 style={{ fontWeight: 600, fontSize: "1rem" }}>{finding.title}</h3>
            <p>{finding.description}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Impact: {finding.impact} | Fix effort: {finding.effort}
            </p>
            <p style={{ borderTop: "1px dashed var(--line)", paddingTop: "0.5rem", marginTop: "0.3rem" }}>
              Recommendation: {finding.recommendation}
            </p>
          </article>
        ))}
      </section>

      <section className="card hero">
        <h2>Audit your site right now</h2>
        <p>
          Get a complete technical audit report in under 60 seconds. No signup required, no
          payment needed, no software to install.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/en/audit">
            Start Free Audit
          </Link>
          <Link className="button secondary" href="/audit">
            شروع ارزیابی (فارسی)
          </Link>
        </div>
      </section>
    </main>
  );
}
