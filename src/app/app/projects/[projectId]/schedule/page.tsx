import { prisma } from "../../../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../../../lib/auth";
import { canScheduleAudit } from "../../../../../lib/usage";
import { ScheduleManager } from "../../../../../components/ScheduleManager";
import Link from "next/link";

export const metadata = {
  title: "زمان‌بندی ممیزی"
};

export default async function SchedulePage({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params;
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: org.id }
  });

  if (!project) {
    return (
      <main style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <h1>پروژه پیدا نشد</h1>
        <Link href="/app/projects" style={{ color: "#2563eb" }}>بازگشت به پروژه‌ها</Link>
      </main>
    );
  }

  const schedule = await prisma.scheduledAudit.findFirst({
    where: { projectId, organizationId: org.id }
  });

  const { allowed: canSchedule } = await canScheduleAudit(org.id);

  const recentRuns = await prisma.auditRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      summary: true
    }
  });

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/app/projects/${projectId}`} style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          ← بازگشت به پروژه
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>زمان‌بندی ممیزی — {project.name}</h1>
      </div>

      <ScheduleManager
        projectId={projectId}
        schedule={schedule ? {
          id: schedule.id,
          frequency: schedule.frequency,
          enabled: schedule.enabled,
          nextRunAt: schedule.nextRunAt.toISOString(),
          lastRunAt: schedule.lastRunAt?.toISOString() ?? null
        } : null}
        canSchedule={canSchedule}
      />

      {recentRuns.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>آخرین اجراها</h2>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>وضعیت</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run: { id: string; status: string; createdAt: Date }) => (
                  <tr key={run.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem" }}>
                      {new Date(run.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <span className={`badge ${run.status === "SUCCEEDED" ? "sev-low" : run.status === "FAILED" ? "sev-critical" : "sev-medium"}`}>
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <Link href={`/app/projects/${projectId}/audits/${run.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
