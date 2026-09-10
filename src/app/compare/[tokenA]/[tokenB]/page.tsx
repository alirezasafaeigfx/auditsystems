import Link from "next/link";
import { prisma } from "../../../../lib/db";
import { isReportShareAccessible } from "../../../../lib/reportShare";
import { compareAuditRuns, type AuditRun } from "../../../../lib/audit-comparison";
import { cookies } from "next/headers";
import { getReportAccessCookieName, verifyReportAccessCredential } from "../../../../lib/report-access";
import { hasPassword } from "../../../../lib/reportShare";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  if (direction === "unavailable") return "#6b7280";
  return "#6b7280";
}

function directionIcon(direction: string): string {
  if (direction === "improved") return "↑";
  if (direction === "regressed") return "↓";
  if (direction === "unavailable") return "—";
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

  const cookieStore = await cookies();
  const authorized = [shareA, shareB].every((share) => (
    !hasPassword(share)
    || verifyReportAccessCredential(
      cookieStore.get(getReportAccessCookieName(share.token))?.value,
      share.token,
    )
  ));
  if (!authorized) {
    return (
      <main>
        <section className="card">
          <h1>مقایسه در دسترس نیست</h1>
          <p>برای مقایسه، ابتدا دسترسی هر دو گزارش را تأیید کنید.</p>
        </section>
      </main>
    );
  }

  const runA = shareA.run;
  const runB = shareB.run;

  const comparison = compareAuditRuns(
    { findings: runA.findings as AuditRun["findings"], summary: runA.summary as AuditRun["summary"], status: runA.status },
    { findings: runB.findings as AuditRun["findings"], summary: runB.summary as AuditRun["summary"], status: runB.status }
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
            <div style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.25rem" }}>قبل</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text)" }}>
              {comparison.overall.before ?? "ناموجود"}{comparison.overall.before === null ? null : <span style={{ fontSize: "1rem" }}>/100</span>}
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>{comparison.gradeBefore}</div>
            <div>{comparison.availabilityBefore} · پوشش {comparison.coverageBefore === null ? "نامشخص" : `${Math.round(comparison.coverageBefore * 100)}%`}</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: directionColor(comparison.overall.direction),
              }}
            >
                  {comparison.overall.direction === "unavailable" ? "شواهد برای مقایسه هم‌ارز نیست" : `${directionIcon(comparison.overall.direction)} ${Math.abs(comparison.overall.delta ?? 0)}`}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.25rem" }}>بعد</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: directionColor(comparison.overall.direction) }}>
              {comparison.overall.after ?? "ناموجود"}{comparison.overall.after === null ? null : <span style={{ fontSize: "1rem" }}>/100</span>}
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: directionColor(comparison.overall.direction) }}>{comparison.gradeAfter}</div>
            <div>{comparison.availabilityAfter} · پوشش {comparison.coverageAfter === null ? "نامشخص" : `${Math.round(comparison.coverageAfter * 100)}%`}</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: "1.5rem" }}>
        <h2>مقایسه دسته‌بندی‌ها</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", color: "var(--muted)" }}>دسته</th>
              <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", color: "var(--muted)" }}>قبل</th>
              <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", color: "var(--muted)" }}>بعد</th>
              <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", color: "var(--muted)" }}>تفاوت</th>
            </tr>
          </thead>
          <tbody>
            {comparison.categories.map((cat: { category: string; label: string; before: number | null; after: number | null; delta: number | null; direction: string }) => (
              <tr key={cat.category} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "0.75rem", fontWeight: 600 }}>{cat.label}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>{cat.before ?? "ناموجود"}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>{cat.after ?? "ناموجود"}</td>
                <td style={{ padding: "0.75rem", textAlign: "center", color: directionColor(cat.direction), fontWeight: 600 }}>
                  {cat.direction === "unavailable" ? "Not comparable" : `${directionIcon(cat.direction)} ${Math.abs(cat.delta ?? 0)}`}
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
