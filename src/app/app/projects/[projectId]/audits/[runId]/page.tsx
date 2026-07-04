import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../../../lib/auth";

type Props = { params: Promise<{ projectId: string; runId: string }> };

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

  const findingsByCategory = new Map<string, typeof audit.findings>();
  for (const f of audit.findings) {
    const list = findingsByCategory.get(f.category) || [];
    list.push(f);
    findingsByCategory.set(f.category, list);
  }

  const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  const severityColors: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: "#fef2f2", text: "#991b1b" },
    HIGH: { bg: "#fff7ed", text: "#9a3412" },
    MEDIUM: { bg: "#fffbeb", text: "#92400e" },
    LOW: { bg: "#f0fdf4", text: "#166534" },
    INFO: { bg: "#f0f9ff", text: "#075985" }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/app/projects/${project.id}`} style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none" }}>
          ← {project.name}
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Audit Detail</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{audit.url}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <span style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            background: audit.status === "SUCCEEDED" ? "#d1fae5" : audit.status === "FAILED" ? "#fee2e2" : "#e5e7eb",
            color: audit.status === "SUCCEEDED" ? "#065f46" : audit.status === "FAILED" ? "#991b1b" : "#374151"
          }}>
            {audit.status}
          </span>
          {audit.shares[0]?.token && (
            <a href={`/audit/r/${audit.shares[0].token}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: "#0f7a66", color: "#fff", textDecoration: "none" }}>
              View Report
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>Depth</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{audit.depth}</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>Findings</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{audit.findings.length}</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>Resources</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{audit.resources.length}</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>Duration</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            {audit.finishedAt && audit.startedAt
              ? `${Math.round((audit.finishedAt.getTime() - audit.startedAt.getTime()) / 1000)}s`
              : "—"}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
        <span>Started: {audit.startedAt ? new Date(audit.startedAt).toLocaleString() : "—"}</span>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <span>Finished: {audit.finishedAt ? new Date(audit.finishedAt).toLocaleString() : "—"}</span>
      </div>

      {audit.findings.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Findings</h2>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {severityOrder.map((sev) => {
              const findings = findingsBySeverity.get(sev);
              if (!findings) return null;
              return (
                <span key={sev} style={{ padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 600, background: severityColors[sev]?.bg || "#f3f4f6", color: severityColors[sev]?.text || "#374151" }}>
                  {sev}: {findings.length}
                </span>
              );
            })}
          </div>

          {severityOrder.map((sev) => {
            const findings = findingsBySeverity.get(sev);
            if (!findings) return null;
            return (
              <div key={sev} style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: severityColors[sev]?.text || "#374151", marginBottom: "0.5rem" }}>
                  {sev} ({findings.length})
                </h3>
                {findings.map((f) => (
                  <div key={f.id} style={{ border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{f.title}</span>
                      <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{f.code}</span>
                    </div>
                    {f.description && (
                      <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.25rem 0" }}>{f.description}</p>
                    )}
                    {f.recommendation && (
                      <p style={{ color: "#0f7a66", fontSize: "0.875rem", margin: "0.25rem 0", fontStyle: "italic" }}>💡 {f.recommendation}</p>
                    )}
                    <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{f.category}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {audit.resources.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Resources ({audit.resources.length})</h2>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>URL</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", fontWeight: 600 }}>Third Party</th>
                </tr>
              </thead>
              <tbody>
                {audit.resources.slice(0, 30).map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem" }}>{r.kind}</td>
                    <td style={{ padding: "0.5rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.url}</td>
                    <td style={{ padding: "0.5rem" }}>{r.isThirdParty ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.resources.length > 30 && (
              <div style={{ padding: "0.5rem", color: "#9ca3af", fontSize: "0.75rem", textAlign: "center" }}>
                Showing 30 of {audit.resources.length} resources
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
