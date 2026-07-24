import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../lib/auth";
import { RunAuditButton } from "../../../../components/RunAuditButton";
import { ScheduleManager } from "../../../../components/ScheduleManager";
import { ScoreTrend } from "../../../../components/ScoreTrend";
import { getUsageStats, canScheduleAudit } from "../../../../lib/usage";

type Props = { params: Promise<{ projectId: string }> };

export async function generateMetadata() {
  return { title: `پروژه` };
}

export default async function ProjectDetailPage({ params }: Props) {
  const user = await validateSession();
  if (!user) return null;

  const { projectId } = await params;
  const membership = await getOrganizationForUser(user.id);
  const orgId = membership?.organizationId;
  if (!orgId) return notFound();

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId }
  });
  if (!project) return notFound();

  const usage = await getUsageStats(orgId);

  const audits = await prisma.auditRun.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      url: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      summary: true,
      shares: { select: { token: true }, take: 1 }
    }
  });

  const latestAudit = audits[0];
  const summary = latestAudit?.summary as Record<string, unknown> | null;
  const issueCount = summary ? ((summary as Record<string, unknown>).totalIssues as number ?? 0) : 0;

  const statusLabels: Record<string, string> = {
    SUCCEEDED: "موفق",
    FAILED: "ناموفق",
    RUNNING: "در حال اجرا",
    QUEUED: "در صف"
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/app/projects" style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", textDecoration: "none" }}>→ همه پروژه‌ها</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{project.name}</h1>
          <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{project.domain}</p>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem" }}>مصرف ماهانه</div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {usage.auditCount} / {usage.auditLimit} ممیزی
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <RunAuditButton
          projectId={project.id}
          monthlyAudits={usage.auditCount}
          limit={usage.auditLimit}
        />
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>ممیزی زمان‌بندی شده</h2>
        <ScheduleManager
          projectId={project.id}
          schedule={null}
          canSchedule={(await canScheduleAudit(orgId)).allowed}
        />
      </div>

      {issueCount > 0 && (
        <div style={{ padding: "1rem", background: "var(--brand-bg, #f0fdf4)", border: "1px solid color-mix(in srgb, var(--success) 30%, var(--line))", borderRadius: "0.5rem", marginBottom: "2rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>خلاصه آخرین ممیزی</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text, #374151)" }}>
            {issueCount} مشکل پیدا شد. {latestAudit?.shares[0]?.token && (
              <a href={`/audit/r/${latestAudit.shares[0].token}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand, #2563eb)", textDecoration: "none", fontWeight: 600 }}>
                مشاهده گزارش کامل ←
              </a>
            )}
          </div>
        </div>
      )}

      <ScoreTrend
        audits={audits
          .filter((a) => a.status === "SUCCEEDED" && a.summary)
          .slice(0, 12)
          .reverse()
          .map((a) => ({
            score: (a.summary as Record<string, unknown> | null)?.score as number ?? 0,
            createdAt: a.createdAt.toISOString(),
          }))}
      />

      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>تاریخچه ممیزی</h2>

      {audits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem" }}>
          <p style={{ color: "var(--muted, #6b7280)", marginBottom: "0.5rem" }}>هنوز ممیزی‌ای انجام نشده.</p>
          <p style={{ color: "var(--muted, #9ca3af)", fontSize: "0.875rem" }}>اولین ممیزی خود را از بالا اجرا کنید.</p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>وضعیت</th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>شروع</th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>پایان</th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>جزئیات</th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>گزارش</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                  <td style={{ padding: "0.75rem" }}>
                    <span className={`badge ${audit.status === "SUCCEEDED" ? "sev-low" : audit.status === "FAILED" ? "sev-critical" : ""}`}>
                      {statusLabels[audit.status] ?? audit.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>
                    {new Date(audit.createdAt).toLocaleString("fa-IR")}
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>
                    {audit.finishedAt ? new Date(audit.finishedAt).toLocaleString("fa-IR") : "—"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <Link href={`/app/projects/${project.id}/audits/${audit.id}`} style={{ color: "var(--brand, #2563eb)", textDecoration: "none" }}>
                      مشاهده
                    </Link>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {audit.shares[0]?.token ? (
                      <a href={`/audit/r/${audit.shares[0].token}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand, #2563eb)", textDecoration: "none" }}>
                        گزارش
                      </a>
                    ) : (
                      <span style={{ color: "var(--muted, #d1d5db)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
