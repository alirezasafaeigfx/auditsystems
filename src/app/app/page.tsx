import Link from "next/link";
import { prisma } from "../../lib/db";
import { validateSession, getOrganizationForUser } from "../../lib/auth";
import { getUsageStats } from "../../lib/usage";
import { formatPriceToman, isPaidPlan, type PlanCode } from "../../lib/plans";

export const metadata = {
  title: "داشبورد"
};

export default async function AppDashboardPage() {
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const usage = await getUsageStats(org.id);

  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId: org.id,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });

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
      summary: true,
      project: { select: { id: true, name: true } },
      shares: { select: { token: true }, take: 1 }
    }
  });

  const latestAudit = recentAudits[0];
  const latestStatus = latestAudit?.status;
  const latestSummary = latestAudit?.summary as { score?: number } | null;
  const latestScore = latestSummary?.score;

  const criticalFindings = await prisma.auditFinding.count({
    where: {
      run: { organizationId: org.id },
      severity: { in: ["HIGH", "CRITICAL"] }
    }
  });

  const nextScheduled = await prisma.scheduledAudit.findFirst({
    where: {
      organizationId: org.id,
      enabled: true,
      nextRunAt: { gt: new Date() }
    },
    orderBy: { nextRunAt: "asc" },
    include: { project: { select: { name: true } } }
  });

  const currentPlanCode = subscription?.plan.code ?? "free";
  const currentPlan = subscription?.plan ?? null;

  const statusLabels: Record<string, string> = {
    SUCCEEDED: "موفق",
    FAILED: "ناموفق",
    RUNNING: "در حال اجرا",
    QUEUED: "در صف"
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>داشبورد</h1>
          <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem" }}>
            {org.name} · اشتراک: <strong>{usage.plan.name}</strong>
            {currentPlan && (
              <span> · {formatPriceToman(currentPlan.priceMonthlyToman)}/ماه</span>
            )}
          </p>
        </div>
        <Link href="/app/billing" className="button secondary" style={{ fontSize: "0.875rem", padding: "0.375rem 1rem", textDecoration: "none" }}>
          {isPaidPlan(currentPlanCode as PlanCode) ? "مدیریت اشتراک ←" : "ارتقای اشتراک ←"}
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>پروژه‌ها</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {usage.projectCount} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--muted, #9ca3af)" }}>/ {usage.projectLimit}</span>
          </div>
          {!usage.canCreateProject && (
            <Link href="/app/billing" style={{ color: "var(--warn, #f59e0b)", fontSize: "0.75rem", textDecoration: "none" }}>سقف رسید — ارتقا دهید</Link>
          )}
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>ممیزی این ماه</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {usage.auditCount} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--muted, #9ca3af)" }}>/ {usage.auditLimit}</span>
          </div>
          <div style={{ height: "4px", background: "var(--border, #e5e7eb)", borderRadius: "2px", marginTop: "4px" }}>
            <div style={{ height: "100%", background: usage.canRunAudit ? "var(--brand, #0f7a66)" : "var(--warn, #f59e0b)", borderRadius: "2px", width: `${Math.min(100, (usage.auditCount / usage.auditLimit) * 100)}%` }} />
          </div>
          {!usage.canRunAudit && (
            <Link href="/app/billing" style={{ color: "var(--warn, #f59e0b)", fontSize: "0.75rem", textDecoration: "none" }}>سقف رسید — ارتقا دهید</Link>
          )}
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>آخرین ممیزی</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {latestStatus ? (
              <span className={`badge ${latestStatus === "SUCCEEDED" ? "sev-low" : latestStatus === "FAILED" ? "sev-critical" : ""}`}>
                {statusLabels[latestStatus] ?? latestStatus}
              </span>
            ) : (
              <span style={{ color: "var(--muted, #d1d5db)" }}>—</span>
            )}
          </div>
          {latestScore != null && (
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)", marginTop: "0.25rem" }}>
              امتیاز: {latestScore}/۱۰۰
            </div>
          )}
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>مشکلات باز</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {criticalFindings > 0 ? (
              <span style={{ color: criticalFindings > 5 ? "var(--danger, #dc2626)" : "var(--warn, #f59e0b)" }}>{criticalFindings}</span>
            ) : (
              <span style={{ color: "var(--brand, #059669)" }}>۰</span>
            )}
          </div>
          {criticalFindings > 0 && (
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)", marginTop: "0.25rem" }}>بحرانی/بالا</div>
          )}
        </div>
      </div>

      {(nextScheduled || !isPaidPlan(currentPlanCode as PlanCode)) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {nextScheduled && (
            <div className="card" style={{ padding: "1rem", border: "1px solid #bbf7d0", background: "var(--brand-bg, #f0fdf4)" }}>
              <div style={{ color: "var(--brand-strong, #065f46)", fontSize: "0.75rem", marginBottom: "0.25rem", fontWeight: 600 }}>ممیزی زمان‌بندی شده بعدی</div>
              <div style={{ fontWeight: 600 }}>{nextScheduled.project.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>
                {new Date(nextScheduled.nextRunAt).toLocaleDateString("fa-IR")} · {nextScheduled.frequency === "WEEKLY" ? "هفتگی" : "ماهانه"}
              </div>
            </div>
          )}
          {!isPaidPlan(currentPlanCode as PlanCode) && (
            <div className="card" style={{ padding: "1rem", border: "1px solid #fde68a", background: "var(--warn-bg, #fffbeb)" }}>
              <div style={{ color: "var(--warn, #92400e)", fontSize: "0.75rem", marginBottom: "0.25rem", fontWeight: 600 }}>یادآوری ارتقا</div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>ممیزی بیشتر، اسکن زمان‌بندی شده و گزارش PDF فعال کنید.</div>
              <Link href="/app/billing" style={{ display: "inline-block", marginTop: "0.5rem", color: "var(--brand, #0f7a66)", fontWeight: 600, fontSize: "0.875rem" }}>
                مشاهده پلن‌ها ←
              </Link>
            </div>
          )}
          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>صورتحساب</div>
            <div style={{ fontWeight: 600 }}>
              {subscription ? (
                <span style={{ color: "var(--brand, #059669)" }}>فعال — {subscription.plan.name}</span>
              ) : (
                <span>پلن رایگان</span>
              )}
            </div>
            <Link href="/app/billing" style={{ display: "inline-block", marginTop: "0.5rem", color: "var(--brand, #0f7a66)", fontWeight: 600, fontSize: "0.875rem" }}>
              مدیریت ←
            </Link>
          </div>
        </div>
      )}

      {usage.projectCount === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", border: "2px dashed var(--border, #d1d5db)", borderRadius: "0.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>هنوز پروژه‌ای ندارید</p>
          <p style={{ color: "var(--muted, #6b7280)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>اولین وب‌سایت خود را اضافه کنید تا سئو، عملکرد و امنیت را پایش کنید.</p>
          <Link href="/app/projects/new" className="button" style={{ display: "inline-block", textDecoration: "none" }}>
            افزودن وب‌سایت
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>آخرین ممیزی‌ها</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Link href="/app/projects" style={{ color: "var(--muted, #6b7280)", textDecoration: "none", fontSize: "0.875rem" }}>
                همه پروژه‌ها
              </Link>
              {usage.canCreateProject && (
                <Link href="/app/projects/new" style={{ color: "var(--brand, #0f7a66)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
                  + افزودن وب‌سایت
                </Link>
              )}
            </div>
          </div>
          {recentAudits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem" }}>
              <p style={{ color: "var(--muted, #6b7280)", marginBottom: "1rem" }}>هنوز ممیزی‌ای انجام نشده.</p>
              <Link href="/app/projects" style={{ color: "var(--brand, #0f7a66)", textDecoration: "none", fontWeight: 600 }}>اولین ممیزی خود را اجرا کنید ←</Link>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                    <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>آدرس</th>
                    <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>پروژه</th>
                    <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>وضعیت</th>
                    <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ</th>
                    <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>گزارش</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((audit) => (
                    <tr key={audit.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                      <td style={{ padding: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audit.url}</td>
                      <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{audit.project?.name || "—"}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <span className={`badge ${audit.status === "SUCCEEDED" ? "sev-low" : audit.status === "FAILED" ? "sev-critical" : ""}`}>
                          {statusLabels[audit.status] ?? audit.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>
                        {new Date(audit.createdAt).toLocaleDateString("fa-IR")}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {audit.shares[0]?.token ? (
                          <a href={`/audit/r/${audit.shares[0].token}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand, #0f7a66)", textDecoration: "none" }}>
                            مشاهده
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted, #d1d5db)" }}>-</span>
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
