import Link from "next/link";
import { prisma } from "../../lib/db";
import { validateSession } from "../../lib/auth";
import { getOrganizationForUser } from "../../lib/auth";

export default async function AppDashboardPage() {
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;

  const projectCount = org
    ? await prisma.project.count({ where: { organizationId: org.id } })
    : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const auditCount = org
    ? await prisma.auditRun.count({
        where: {
          organizationId: org.id,
          createdAt: { gte: monthStart }
        }
      })
    : 0;

  const recentAudits = org
    ? await prisma.auditRun.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          url: true,
          status: true,
          createdAt: true,
          finishedAt: true
        }
      })
    : [];

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Dashboard</h1>
      {org && (
        <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
          Organization: <strong>{org.name}</strong>
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Plan</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Free</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Projects</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{projectCount}</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Audits this month</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{auditCount} / 3</div>
        </div>
      </div>

      {projectCount === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", border: "2px dashed #d1d5db", borderRadius: "0.5rem" }}>
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>No projects yet. Add your first website to get started.</p>
          <Link href="/app/projects/new" style={{ display: "inline-block", background: "#0f7a66", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", textDecoration: "none", fontWeight: 600 }}>
            Add Website
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Recent Audits</h2>
            <Link href="/app/projects" style={{ color: "#0f7a66", textDecoration: "none", fontSize: "0.875rem" }}>
              View all projects
            </Link>
          </div>
          {recentAudits.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No audits yet.</p>
          ) : (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>URL</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((audit) => (
                    <tr key={audit.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.75rem" }}>{audit.url}</td>
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
