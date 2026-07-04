import Link from "next/link";
import { prisma } from "../../lib/db";
import { validateSession, getOrganizationForUser } from "../../lib/auth";
import { getUsageStats } from "../../lib/usage";

export default async function AppDashboardPage() {
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const usage = await getUsageStats(org.id);

  const recentAudits = await prisma.auditRun.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      url: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      project: { select: { id: true, name: true } },
      shares: { select: { token: true }, take: 1 }
    }
  });

  const latestAudit = recentAudits[0];
  const latestStatus = latestAudit?.status;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Dashboard</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            {org.name} · Plan: <strong>{usage.plan.name}</strong>
          </p>
        </div>
        <Link href="/app/billing" style={{ color: "#0f7a66", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
          View Plans →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Projects</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {usage.projectCount} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#9ca3af" }}>/ {usage.projectLimit}</span>
          </div>
          {!usage.canCreateProject && (
            <Link href="/app/billing" style={{ color: "#f59e0b", fontSize: "0.75rem", textDecoration: "none" }}>Limit reached — Upgrade</Link>
          )}
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Audits this month</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {usage.auditCount} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#9ca3af" }}>/ {usage.auditLimit}</span>
          </div>
          {!usage.canRunAudit && (
            <Link href="/app/billing" style={{ color: "#f59e0b", fontSize: "0.75rem", textDecoration: "none" }}>Limit reached — Upgrade</Link>
          )}
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Latest Audit</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {latestStatus ? (
              <span style={{
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: latestStatus === "SUCCEEDED" ? "#d1fae5" : latestStatus === "FAILED" ? "#fee2e2" : "#e5e7eb",
                color: latestStatus === "SUCCEEDED" ? "#065f46" : latestStatus === "FAILED" ? "#991b1b" : "#374151"
              }}>
                {latestStatus}
              </span>
            ) : (
              <span style={{ color: "#d1d5db" }}>—</span>
            )}
          </div>
        </div>
      </div>

      {usage.projectCount === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", border: "2px dashed #d1d5db", borderRadius: "0.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>No projects yet</p>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>Add your first website to start monitoring SEO, performance, and security.</p>
          <Link href="/app/projects/new" style={{ display: "inline-block", background: "#0f7a66", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", textDecoration: "none", fontWeight: 600 }}>
            Add Website
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Recent Audits</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Link href="/app/projects" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" }}>
                All Projects
              </Link>
              {usage.canCreateProject && (
                <Link href="/app/projects/new" style={{ color: "#0f7a66", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
                  + Add Website
                </Link>
              )}
            </div>
          </div>
          {recentAudits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
              <p style={{ color: "#6b7280", marginBottom: "1rem" }}>No audits yet.</p>
              <Link href="/app/projects" style={{ color: "#0f7a66", textDecoration: "none", fontWeight: 600 }}>Run your first audit →</Link>
            </div>
          ) : (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>URL</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Project</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Date</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((audit) => (
                    <tr key={audit.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audit.url}</td>
                      <td style={{ padding: "0.75rem", color: "#6b7280" }}>{audit.project?.name || "—"}</td>
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
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {audit.shares[0]?.token ? (
                          <a href={`/audit/r/${audit.shares[0].token}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0f7a66", textDecoration: "none" }}>
                            View
                          </a>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
