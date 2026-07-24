import Link from "next/link";
import { prisma } from "../../../../lib/db";
import { isReportShareAccessible } from "../../../../lib/reportShare";
import { categoryLabel } from "../../../../lib/scoring";
import type { FindingCategory } from "../../../../lib/types";
import { EmailCapture } from "../../../../components/EmailCapture";
import { buildActionPlan, QUADRANT_LABELS } from "../../../../lib/action-plan";

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

function gradeColor(grade: string): string {
  if (grade === "EXCELLENT") return "#059669";
  if (grade === "GOOD") return "#2563eb";
  if (grade === "NEEDS_WORK") return "#d97706";
  return "#dc2626";
}

type Summary = {
  score?: number;
  grade?: string;
  categoryScores?: Record<FindingCategory, number>;
  severityCounts?: Record<string, number>;
};

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const share = await prisma.reportShare.findUnique({
    where: { token },
    include: {
      run: {
        include: {
          findings: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });

  if (!share || !isReportShareAccessible(share)) {
    return (
      <main>
        <section className="card">
          <h1>گزارش پیدا نشد</h1>
          <p>این token معتبر نیست یا گزارش در دسترس نیست.</p>
        </section>
      </main>
    );
  }

  await prisma.reportShare.update({
    where: { token },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date()
    }
  });

  const summary = (share.run.summary as Summary) ?? {};
  const score = summary.score;
  const grade = summary.grade;
  const categoryScores = summary.categoryScores ?? {};
  const severityCounts = summary.severityCounts ?? {};
  const criticalCount = (severityCounts.CRITICAL ?? 0) + (severityCounts.HIGH ?? 0);
  const findings = share.run.findings;
  const topIssues = findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").slice(0, 3);

  return (
    <main>
      <section className="card hero">
        <h1>گزارش Audit</h1>
        <p>هدف: {share.run.normalizedUrl ?? share.run.url}</p>
        <div className="hero-actions">
          <span className={`badge ${statusClass(share.run.status)}`}>{share.run.status}</span>
          <span className="badge" style={{ backgroundColor: "#f3f4f6", color: "var(--text)" }}>
            {share.viewCount + 1} بازدید
          </span>
          <Link className="button secondary" href={`/audit/r/${token}/unlock`}>
            فعال‌سازی تحویل کامل
          </Link>
        </div>
      </section>

      {score != null && grade != null && (
        <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", fontWeight: 800, color: gradeColor(grade) }}>{score}<span style={{ fontSize: "1.5rem" }}>/100</span></div>
          <div style={{ fontSize: "1.25rem", fontWeight: 600, color: gradeColor(grade), marginBottom: "1rem" }}>{grade}</div>

          {Object.keys(categoryScores).length > 0 && (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
              {Object.entries(categoryScores as Record<string, number>).map(([cat, catScore]) => (
                <div key={cat} style={{ textAlign: "center", minWidth: "80px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{categoryLabel(cat as FindingCategory)}</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{catScore}</div>
                </div>
              ))}
            </div>
          )}

          {criticalCount > 0 && (
            <div style={{ marginTop: "1rem", color: "#dc2626", fontWeight: 600 }}>
              {criticalCount} مشکل حیاتی و مهم
            </div>
          )}
        </section>
      )}

      <EmailCapture token={token} />

      {topIssues.length > 0 && (
        <section className="card">
          <h2>مشکلات حیاتی</h2>
          {topIssues.map((finding) => (
            <article key={finding.id} className="finding" style={{ borderLeft: "3px solid #dc2626", paddingLeft: "1rem", marginBottom: "1rem" }}>
              <div className="finding-header">
                <strong>{finding.title}</strong>
                <span className={`badge ${severityClass(finding.severity)}`}>{finding.severity}</span>
              </div>
              {finding.description ? <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{finding.description}</p> : null}
              {finding.recommendation ? <p><strong>پیشنهاد:</strong> {finding.recommendation}</p> : null}
            </article>
          ))}
        </section>
      )}

      {findings.length > 0 && (() => {
        const actionPlan = buildActionPlan(findings);
        const quadrants = ["QUICK_WIN", "MAJOR_PROJECT", "FILL_IN", "THANKLESS"] as const;
        return (
          <section className="card">
            <h2>نقشه اقدام</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>اولویت‌بندی اقدامات بر اساس هزینه و تأثیر</p>
            {quadrants.map((q) => {
              const items = actionPlan.filter((a) => a.quadrant === q);
              if (items.length === 0) return null;
              const quadrant = QUADRANT_LABELS[q];
              return (
                <div key={q} style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: quadrant.color, marginBottom: "0.5rem" }}>
                    {quadrant.title} ({items.length})
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>{quadrant.description}</p>
                  {items.map((item) => (
                    <div key={item.code} style={{ padding: "0.75rem", border: "1px solid var(--line)", borderRadius: "0.375rem", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "0.875rem" }}>{item.title}</strong>
                        <span className={`badge ${severityClass(item.severity)}`} style={{ fontSize: "0.75rem" }}>{item.severity}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>{item.recommendation}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })()}

      <section className="card grid">
        <h2>یافته‌ها ({findings.length})</h2>
        {findings.length === 0 ? <p>هنوز یافته‌ای ثبت نشده است.</p> : null}
        {findings.map((finding) => (
          <article key={finding.id} className="finding">
            <div className="finding-header">
              <strong>{finding.code}</strong>
              <span className={`badge ${severityClass(finding.severity)}`}>{finding.severity}</span>
            </div>
            <p>{finding.title}</p>
            {finding.recommendation ? <p>پیشنهاد: {finding.recommendation}</p> : null}
          </article>
        ))}
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>گزارش کامل بگیرید</h2>
        <p>گزارش کامل با جزئیات، نقشه اقدام، و خروجی PDF</p>
        <Link className="button" href={`/audit/r/${token}/unlock`} style={{ display: "inline-block", marginTop: "1rem" }}>
          فعال‌سازی تحویل کامل
        </Link>
      </section>
    </main>
  );
}
