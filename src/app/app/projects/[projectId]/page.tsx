import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../lib/auth";
import { RunAuditButton } from "../../../../components/RunAuditButton";
import { getUsageStats } from "../../../../lib/usage";

type Props = { params: Promise<{ projectId: string }> };

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

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/app/projects" style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none" }}>← All Projects</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{project.name}</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>{project.domain}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>Monthly usage</div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {usage.auditCount} / {usage.auditLimit} audits
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

      {issueCount > 0 && (
        <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", marginBottom: "2rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>Latest Audit Summary</div>
          <div style={{ fontSize: "0.875rem", color: "#374151" }}>
            {issueCount} issues found. {latestAudit?.shares[0]?.token && (
              <a href={`/audit/r/${latestAudit.shares[0].token}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0f7a66", textDecoration: "none", fontWeight: 600 }}>
                View full report →
              </a>
            )}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Audit History</h2>

      {audits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
          <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>No audits yet.</p>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Run your first audit above to get started.</p>
        </div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Started</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Finished</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Details</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Report</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: audit.status === "SUCCEEDED" ? "#d1fae5" : audit.status === "FAILED" ? "#fee2e2" : "#e5e7eb",
                      color: audit.status === "SUCCEEDED" ? "#065f46" : audit.status === "FAILED" ? "#991b1b" : "#374151"
                    }}>
                      {audit.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                    {new Date(audit.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                    {audit.finishedAt ? new Date(audit.finishedAt).toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <Link href={`/app/projects/${project.id}/audits/${audit.id}`} style={{ color: "#0f7a66", textDecoration: "none" }}>
                      View
                    </Link>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {audit.shares[0]?.token ? (
                      <a href={`/audit/r/${audit.shares[0].token}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0f7a66", textDecoration: "none" }}>
                        Report
                      </a>
                    ) : (
                      <span style={{ color: "#d1d5db" }}>—</span>
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
