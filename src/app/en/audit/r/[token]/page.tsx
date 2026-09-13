import Link from "next/link";
import { prisma } from "../../../../../lib/db";
import { isReportShareAccessible } from "../../../../../lib/reportShare";
import { hasPassword } from "../../../../../lib/reportShare";
import { cookies } from "next/headers";
import { ReportAccessChallenge } from "../../../../../components/ReportAccessChallenge";
import { getReportAccessCookieName, verifyReportAccessCredential } from "../../../../../lib/report-access";
import { resolveReportResult } from "../../../../../lib/report-result";
import { reportGradeLabel, reportStatusLabel, reportWithheldReasonEn } from "../../../../../lib/report-labels";
import AuditCtaLink from "../../../../../components/AuditCtaLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function severityClass(severity: string): string {
  const s = severity.toUpperCase();
  if (s === "CRITICAL") return "sev-critical";
  if (s === "HIGH") return "sev-high";
  if (s === "MEDIUM") return "sev-medium";
  return "";
}

function statusClass(status: string): string {
  return status === "FAILED" ? "status-failed" : "";
}

export default async function ReportPageEn({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const share = await prisma.reportShare.findUnique({
    where: { token },
    include: { run: { include: { findings: { orderBy: { createdAt: "asc" } } } } }
  });

  if (!share || !isReportShareAccessible(share)) {
    return (
      <main>
        <section className="card">
          <h1>Report not found</h1>
          <p>This token is invalid or the report is unavailable.</p>
        </section>
      </main>
    );
  }

  if (hasPassword(share)) {
    const cookieStore = await cookies();
    const credential = cookieStore.get(getReportAccessCookieName(token))?.value;
    if (!verifyReportAccessCredential(credential, token)) {
      return <ReportAccessChallenge token={token} locale="en" />;
    }
  }

  const result = resolveReportResult({ summary: share.run.summary, findings: share.run.findings, runStatus: share.run.status });
  const withheldReasonEn = reportWithheldReasonEn(result);
  const findings = share.run.status === "SUCCEEDED" ? share.run.findings : [];

  return (
    <main>
      <section className="card hero">
        <h1>Audit Report</h1>
        <p>Target: <bdi dir="ltr" style={{ overflowWrap: "anywhere" }}>{share.run.normalizedUrl ?? share.run.url}</bdi></p>
        <div className="hero-actions">
          <span className={`badge ${statusClass(share.run.status)}`}>{reportStatusLabel(share.run.status, "en")}</span>
          {share.run.status === "SUCCEEDED" ? <Link className="button secondary" href={`/en/audit/r/${token}/unlock`}>Unlock Full Delivery</Link> : null}
        </div>
      </section>

      <section className="card" aria-label="Result coverage status">
        <strong>{result.availability === "AVAILABLE" ? "Complete result" : result.availability === "PARTIAL" ? "Partial result" : result.availability === "LEGACY" ? "Legacy report with unknown coverage" : "Score unavailable"}</strong>
        <p>Coverage: {result.coverage.ratio == null ? "Unknown" : `${Math.round(result.coverage.ratio * 100)}%`}{withheldReasonEn ? ` — ${withheldReasonEn}` : ""}</p>
        {result.score ? <p>{result.score.overall}/100 ({reportGradeLabel(result.score.grade, "en")})</p> : null}
      </section>

      <section className="card grid">
        <h2>Findings ({findings.length})</h2>
        {findings.length === 0 ? <p>No confirmed findings available.</p> : null}
        {findings.map((finding) => (
          <article key={finding.id} className="finding">
            <div className="finding-header">
              <strong>{finding.code}</strong>
              <span className={`badge ${severityClass(finding.severity)}`}>{finding.severity}</span>
            </div>
            <p>{finding.title}</p>
            {finding.recommendation ? <p>Recommendation: {finding.recommendation}</p> : null}
          </article>
        ))}
      </section>
      {share.run.status === "SUCCEEDED" ? <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Need help implementing the fixes?</h2>
        <AuditCtaLink ctaId="report_implementation_help" locale="en" />
      </section> : null}
    </main>
  );
}
