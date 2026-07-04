import Link from "next/link";
import { prisma } from "../../../lib/db";
import { getOrganizationForUser, validateSession } from "../../../lib/auth";
import { getUsageStats } from "../../../lib/usage";

export default async function ProjectsPage() {
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const usage = await getUsageStats(org.id);

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { auditRuns: true } },
      auditRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, createdAt: true }
      }
    }
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Projects</h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            {usage.projectCount} / {usage.projectLimit} projects
          </p>
        </div>
        {usage.canCreateProject ? (
          <Link href="/app/projects/new" style={{ display: "inline-block", background: "#0f7a66", color: "#fff", padding: "0.5rem 1rem", borderRadius: "0.375rem", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
            + Add Project
          </Link>
        ) : (
          <Link href="/app/billing" style={{ display: "inline-block", background: "#f59e0b", color: "#fff", padding: "0.5rem 1rem", borderRadius: "0.375rem", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
            Upgrade to Add More
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", border: "2px dashed #d1d5db", borderRadius: "0.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>No projects yet</p>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>Add your first website to start monitoring.</p>
          <Link href="/app/projects/new" style={{ display: "inline-block", background: "#0f7a66", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", textDecoration: "none", fontWeight: 600 }}>
            Add your first website
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {projects.map((project) => {
            const lastAudit = project.auditRuns[0];
            return (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                style={{
                  display: "block",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1rem 1.5rem",
                  textDecoration: "none",
                  color: "#111827",
                  transition: "border-color 0.15s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{project.name}</div>
                    <div style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>{project.domain}</div>
                  </div>
                  {lastAudit && (
                    <span style={{
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: lastAudit.status === "SUCCEEDED" ? "#d1fae5" : lastAudit.status === "FAILED" ? "#fee2e2" : "#e5e7eb",
                      color: lastAudit.status === "SUCCEEDED" ? "#065f46" : lastAudit.status === "FAILED" ? "#991b1b" : "#374151"
                    }}>
                      {lastAudit.status}
                    </span>
                  )}
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                  {project._count.auditRuns} audit{project._count.auditRuns !== 1 ? "s" : ""}
                  {" · "}
                  Created {new Date(project.createdAt).toLocaleDateString()}
                  {lastAudit && ` · Last audit ${new Date(lastAudit.createdAt).toLocaleDateString()}`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
