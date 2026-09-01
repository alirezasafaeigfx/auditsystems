import type { Metadata } from "next";
import QualificationForm from "../../qualification/QualificationForm";
import { buildPageMetadata } from "../../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/qualification",
  title: "Request an ASDEV Audit Assessment",
  description:
    "Qualification form to request a technical, SEO, performance, and security audit of your website.",
  keywords: [
    "audit request",
    "site assessment",
    "technical audit",
    "SEO audit",
    "security audit",
  ],
});

export default function QualificationPageEn() {
  return (
    <main className="audit-page">
      <section className="card hero hero-large">
        <span className="badge hero-badge">Request Assessment</span>
        <h1>Request a manual, deliverable audit</h1>
        <p className="hero-lead">
          This path is for businesses that need a deliverable report, a
          prioritised fix list, and a hand-finished audit.
        </p>
      </section>
      <section className="audit-layout">
        <QualificationForm locale="en" />
        <aside className="card grid">
          <h2>Who is this for?</h2>
          <ul>
            <li>
              An active site with technical, SEO, speed, or security issues
            </li>
            <li>
              A team or agency that needs a deliverable report for a client
            </li>
            <li>
              A business owner who wants to know which fixes to prioritise
            </li>
          </ul>
          <h2>Who is this NOT for?</h2>
          <ul>
            <li>
              Sites without a public domain or reviewable content
            </li>
            <li>
              Requests that guarantee rankings, sales, or definitive results
            </li>
            <li>
              Private-access needs without a separate agreement
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
