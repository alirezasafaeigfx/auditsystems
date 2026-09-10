import Link from "next/link";
import { prisma } from "../../../../../lib/db";
import { isReportShareAccessible } from "../../../../../lib/reportShare";
import { hasPassword } from "../../../../../lib/reportShare";
import { cookies } from "next/headers";
import { ReportAccessChallenge } from "../../../../../components/ReportAccessChallenge";
import { getReportAccessCookieName, verifyReportAccessCredential } from "../../../../../lib/report-access";
import { resolveReportResult } from "../../../../../lib/report-result";

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

  return (
    <main>
      <section className="card hero">
        <h1>Audit Report</h1>
        <p>Target: {share.run.normalizedUrl ?? share.run.url}</p>
        <div className="hero-actions">
          <span className={`badge ${statusClass(share.run.status)}`}>{share.run.status}</span>
          <Link className="button secondary" href={`/en/audit/r/${token}/unlock`}>Unlock Full Delivery</Link>
        </div>
      </section>

      <section className="card" aria-label="Result coverage status">
        <strong>{result.availability === "AVAILABLE" ? "Complete result" : result.availability === "PARTIAL" ? "Partial result" : result.availability === "LEGACY" ? "Legacy report with unknown coverage" : "Score unavailable"}</strong>
        <p>Coverage: {result.coverage.ratio == null ? "Unknown" : `${Math.round(result.coverage.ratio * 100)}%`}{result.withheldReason ? ` — ${result.withheldReason}` : ""}</p>
        {result.score ? <p>{result.score.overall}/100 ({result.score.grade})</p> : null}
      </section>

      <section className="card grid">
        <h2>Findings ({share.run.findings.length})</h2>
        {share.run.findings.length === 0 ? <p>No findings yet.</p> : null}
        {share.run.findings.map((finding) => (
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
    </main>
  );
}
