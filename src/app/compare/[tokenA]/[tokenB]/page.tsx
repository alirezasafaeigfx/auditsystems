import Link from "next/link";
import { prisma } from "../../../../lib/db";
import { isReportShareAccessible } from "../../../../lib/reportShare";
import { compareAuditRuns, type AuditRun } from "../../../../lib/audit-comparison";

function severityClass(severity: string): string {
  const s = severity.toUpperCase();
  if (s === "CRITICAL") return "sev-critical";
  if (s === "HIGH") return "sev-high";
  if (s === "MEDIUM") return "sev-medium";
  return "";
}

function directionColor(direction: string): string {
  if (direction === "improved") return "#059669";
  if (direction === "regressed") return "#dc2626";
  return "#6b7280";
}

function directionIcon(direction: string): string {
  if (direction === "improved") return "↑";
  if (direction === "regressed") return "↓";
  return "→";
}

export default async function ComparePage({ params }: { params: Promise<{ tokenA: string; tokenB: string }> }) {
  const { tokenA, tokenB } = await params;

  const [shareA, shareB] = await Promise.all([
    prisma.reportShare.findUnique({
      where: { token: tokenA },
      include: { run: { include: { findings: { orderBy: { createdAt: "asc" } } } } }
    }),
    prisma.reportShare.findUnique({
      where: { token: tokenB },
      include: { run: { include: { findings: { orderBy: { createdAt: "asc" } } } } }
    }),
  ]);

  if (!shareA || !isReportShareAccessible(shareA) || !shareB || !isReportShareAccessible(shareB)) {
    return (
      <main>
        <section className="card">
          <h1>گزارش پیدا نشد</h1>
          <p>یکی از token‌ها معتبر نیست یا گزارش در دسترس نیست.</p>
        </section>
      </main>
    );
  }

  const runA = shareA.run;
  const runB = shareB.run;

  const comparison = compareAuditRuns(
    { findings: runA.findings as AuditRun["findings"], summary: runA.summary as AuditRun["summary"] },
    { findings: runB.findings as AuditRun["findings"], summary: runB.summary as AuditRun["summary"] }
  );

  return (
    <main>
      <section className="card hero">
        <h1>مقایسه دو Audit</h1>
        <p>
          {runA.normalizedUrl ?? runA.url} در مقابل {runB.normalizedUrl ?? runB.url}
        </p>
        <div className="hero-actions">
          <Link className="button secondary" href={`/audit/r/${tokenA}`}>گزارش اول</Link>
          <Link className="button secondary" href={`/audit/r/${tokenB}`}>گزارش دوم</Link>
        </div>
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>تفاوت امتیاز</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "3rem", alignItems: "center", marginTop: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>قبل</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#374151" }}>
              {comparison.overall.before}<span style={{ fontSize: "1rem" }}>/100</span>
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>{comparison.gradeBefore}</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: directionColor(comparison.overall.direction),
              }}
            >
              {directionIcon(comparison.overall.direction)} {Math.abs(comparison.overall.delta)}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>بعد</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: directionColor(comparison.overall.direction) }}>
              {comparison.overall.after}<span style={{ fontSize: "1rem" }}>/100</span>
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: directionColor(comparison.overall.direction) }}>{comparison.gradeAfter}</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: "1.5rem" }}>
        <h2>مقایسه دسته‌بندی‌ها</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>دسته</th>
              <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>قبل</th>
              <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>بعد</th>
              <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>تفاوت</th>
            </tr>
          </thead>
          <tbody>
            {comparison.categories.map((cat: { category: string; label: string; before: number; after: number; delta: number; direction: string }) => (
              <tr key={cat.category} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.75rem", fontWeight: 600 }}>{cat.label}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>{cat.before}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>{cat.after}</td>
                <td style={{ padding: "0.75rem", textAlign: "center", color: directionColor(cat.direction), fontWeight: 600 }}>
                  {directionIcon(cat.direction)} {Math.abs(cat.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {comparison.newIssues.length > 0 && (
        <section className="card">
          <h2>مشکلات جدید ({comparison.newIssues.length})</h2>
          {comparison.newIssues.map((issue: { code: string; title: string; severity: string }) => (
            <article key={issue.code} className="finding" style={{ borderLeft: "3px solid #dc2626", paddingLeft: "1rem", marginBottom: "1rem" }}>
              <div className="finding-header">
                <strong>{issue.title}</strong>
                <span className={`badge ${severityClass(issue.severity)}`}>{issue.severity}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {comparison.resolvedIssues.length > 0 && (
        <section className="card">
          <h2>مشکلات حل شده ({comparison.resolvedIssues.length})</h2>
          {comparison.resolvedIssues.map((issue: { code: string; title: string; severity: string }) => (
            <article key={issue.code} className="finding" style={{ borderLeft: "3px solid #059669", paddingLeft: "1rem", marginBottom: "1rem" }}>
              <div className="finding-header">
                <strong>{issue.title}</strong>
                <span className={`badge ${severityClass(issue.severity)}`}>{issue.severity}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {comparison.unchangedIssues.length > 0 && (
        <section className="card">
          <h2>مشکلات بدون تغییر ({comparison.unchangedIssues.length})</h2>
          {comparison.unchangedIssues.map((issue: { code: string; title: string; severity: string }) => (
            <article key={issue.code} className="finding" style={{ borderLeft: "3px solid #d1d5db", paddingLeft: "1rem", marginBottom: "1rem" }}>
              <div className="finding-header">
                <strong>{issue.title}</strong>
                <span className={`badge ${severityClass(issue.severity)}`}>{issue.severity}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <Link className="button" href={`/audit/r/${tokenB}`} style={{ display: "inline-block" }}>
          مشاهده گزارش کامل
        </Link>
      </section>
    </main>
  );
}
