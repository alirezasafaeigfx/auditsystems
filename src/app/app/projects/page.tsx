import Link from "next/link";
import { prisma } from "../../../lib/db";
import { getOrganizationForUser, validateSession } from "../../../lib/auth";
import { getUsageStats } from "../../../lib/usage";

export const metadata = {
  title: "پروژه‌ها"
};

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

  const statusLabels: Record<string, string> = {
    SUCCEEDED: "موفق",
    FAILED: "ناموفق",
    RUNNING: "در حال اجرا",
    QUEUED: "در صف"
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>پروژه‌ها</h1>
          <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem" }}>
            {usage.projectCount} از {usage.projectLimit} پروژه
          </p>
        </div>
        {usage.canCreateProject ? (
          <Link href="/app/projects/new" className="button" style={{ textDecoration: "none", fontSize: "0.875rem" }}>
            + افزودن پروژه
          </Link>
        ) : (
          <Link href="/app/billing" className="button secondary" style={{ textDecoration: "none", fontSize: "0.875rem", background: "var(--warn, #f59e0b)", color: "#fff" }}>
            ارتقا برای افزودن پروژه
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", border: "2px dashed var(--border, #d1d5db)", borderRadius: "0.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>هنوز پروژه‌ای ندارید</p>
          <p style={{ color: "var(--muted, #6b7280)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>اولین وب‌سایت خود را اضافه کنید تا شروع کنید.</p>
          <Link href="/app/projects/new" className="button" style={{ display: "inline-block", textDecoration: "none" }}>
            افزودن اولین وب‌سایت
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
                className="card"
                style={{
                  display: "block",
                  padding: "1rem 1.5rem",
                  textDecoration: "none",
                  color: "var(--text, #111827)",
                  transition: "border-color 0.15s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{project.name}</div>
                    <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{project.domain}</div>
                  </div>
                  {lastAudit && (
                    <span className={`badge ${lastAudit.status === "SUCCEEDED" ? "sev-low" : lastAudit.status === "FAILED" ? "sev-critical" : ""}`}>
                      {statusLabels[lastAudit.status] ?? lastAudit.status}
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--muted, #9ca3af)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                  {project._count.auditRuns} ممیزی
                  {" · "}
                  ایجاد: {new Date(project.createdAt).toLocaleDateString("fa-IR")}
                  {lastAudit && ` · آخرین ممیزی: ${new Date(lastAudit.createdAt).toLocaleDateString("fa-IR")}`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
