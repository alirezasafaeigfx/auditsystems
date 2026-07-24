import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../../../lib/auth";

type Props = { params: Promise<{ projectId: string; runId: string }> };

export const metadata = {
  title: "جزئیات ممیزی"
};

const severityLabels: Record<string, string> = {
  CRITICAL: "بحرانی",
  HIGH: "بالا",
  MEDIUM: "متوسط",
  LOW: "پایین",
  INFO: "اطلاعاتی"
};

const categoryLabels: Record<string, string> = {
  SECURITY: "امنیت",
  PERFORMANCE: "عملکرد",
  SEO: "سئو",
  RESILIENCE: "پایداری",
  UX: "تجربه کاربری",
  ACCESSIBILITY: "دسترسی‌پذیری"
};

const statusLabels: Record<string, string> = {
  SUCCEEDED: "موفق",
  FAILED: "ناموفق",
  RUNNING: "در حال اجرا",
  QUEUED: "در صف"
};

export default async function AuditDetailPage({ params }: Props) {
  const user = await validateSession();
  if (!user) return null;

  const { projectId, runId } = await params;
  const membership = await getOrganizationForUser(user.id);
  const orgId = membership?.organizationId;
  if (!orgId) return notFound();

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId }
  });
  if (!project) return notFound();

  const audit = await prisma.auditRun.findFirst({
    where: { id: runId, projectId: project.id, organizationId: orgId },
    include: {
      findings: { orderBy: [{ severity: "asc" }, { category: "asc" }] },
      resources: { orderBy: { kind: "asc" } },
      shares: { select: { token: true }, take: 1 }
    }
  });
  if (!audit) return notFound();

  const findingsBySeverity = new Map<string, typeof audit.findings>();
  for (const f of audit.findings) {
    const list = findingsBySeverity.get(f.severity) || [];
    list.push(f);
    findingsBySeverity.set(f.severity, list);
  }

  const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/app/projects/${project.id}`} style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", textDecoration: "none" }}>
          → {project.name}
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>جزئیات ممیزی</h1>
          <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem" }}>{audit.url}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <span className={`badge ${audit.status === "SUCCEEDED" ? "sev-low" : audit.status === "FAILED" ? "sev-critical" : ""}`}>
            {statusLabels[audit.status] ?? audit.status}
          </span>
          {audit.shares[0]?.token && (
            <a href={`/audit/r/${audit.shares[0].token}`} target="_blank" rel="noopener noreferrer"
              className="button" style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", textDecoration: "none" }}>
              مشاهده گزارش
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card" style={{ padding: "0.75rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem" }}>عمق</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{audit.depth === "QUICK" ? "سریع" : "عمیق"}</div>
        </div>
        <div className="card" style={{ padding: "0.75rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem" }}>یافته‌ها</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{audit.findings.length}</div>
        </div>
        <div className="card" style={{ padding: "0.75rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem" }}>منابع</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{audit.resources.length}</div>
        </div>
        <div className="card" style={{ padding: "0.75rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem" }}>مدت زمان</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            {audit.finishedAt && audit.startedAt
              ? `${Math.round((audit.finishedAt.getTime() - audit.startedAt.getTime()) / 1000)} ثانیه`
              : "—"}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>
        <span>شروع: {audit.startedAt ? new Date(audit.startedAt).toLocaleString("fa-IR") : "—"}</span>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <span>پایان: {audit.finishedAt ? new Date(audit.finishedAt).toLocaleString("fa-IR") : "—"}</span>
      </div>

      {audit.findings.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>یافته‌ها</h2>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {severityOrder.map((sev) => {
              const findings = findingsBySeverity.get(sev);
              if (!findings) return null;
              return (
                <span key={sev} className={`badge sev-${sev.toLowerCase()}`}>
                  {severityLabels[sev] ?? sev}: {findings.length}
                </span>
              );
            })}
          </div>

          {severityOrder.map((sev) => {
            const findings = findingsBySeverity.get(sev);
            if (!findings) return null;
            return (
              <div key={sev} style={{ marginBottom: "1.5rem" }}>
                <h3 className={`sev-${sev.toLowerCase()}`} style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  {severityLabels[sev] ?? sev} ({findings.length})
                </h3>
                {findings.map((f) => (
                  <div key={f.id} className="card" style={{ padding: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{f.title}</span>
                      <span style={{ color: "var(--muted, #9ca3af)", fontSize: "0.75rem" }}>{f.code}</span>
                    </div>
                    {f.description && (
                      <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", margin: "0.25rem 0" }}>{f.description}</p>
                    )}
                    {f.recommendation && (
                      <p style={{ color: "var(--brand, #2563eb)", fontSize: "0.875rem", margin: "0.25rem 0", fontStyle: "italic" }}>💡 {f.recommendation}</p>
                    )}
                    <span style={{ color: "var(--muted, #9ca3af)", fontSize: "0.75rem" }}>{categoryLabels[f.category] ?? f.category}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {audit.resources.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>منابع ({audit.resources.length})</h2>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>نوع</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>آدرس</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", fontWeight: 600 }}>_third-party</th>
                </tr>
              </thead>
              <tbody>
                {audit.resources.slice(0, 30).map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "0.5rem" }}>{r.kind}</td>
                    <td style={{ padding: "0.5rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.url}</td>
                    <td style={{ padding: "0.5rem" }}>{r.isThirdParty ? "بله" : "خیر"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.resources.length > 30 && (
              <div style={{ padding: "0.5rem", color: "var(--muted, #9ca3af)", fontSize: "0.75rem", textAlign: "center" }}>
                نمایش ۳۰ از {audit.resources.length} منبع
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
