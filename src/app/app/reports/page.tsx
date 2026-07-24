import Link from "next/link";
import { prisma } from "../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../lib/auth";

export const metadata = {
  title: "تاریخچه گزارش‌ها"
};

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams;
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [reports, total] = await Promise.all([
    prisma.auditRun.findMany({
      where: { organizationId: org.id },
      include: {
        project: { select: { name: true } },
        shares: { select: { token: true }, take: 1 },
        _count: { select: { findings: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.auditRun.count({ where: { organizationId: org.id } })
  ]);

  const totalPages = Math.ceil(total / pageSize);

  function getScore(run: { summary: unknown }): number | null {
    if (!run.summary || typeof run.summary !== "object") return null;
    const s = run.summary as Record<string, unknown>;
    return typeof s.score === "number" ? s.score : null;
  }

  function scoreColor(score: number): string {
    if (score >= 81) return "#059669";
    if (score >= 61) return "#2563eb";
    if (score >= 41) return "#d97706";
    return "#dc2626";
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>تاریخچه گزارش‌ها</h1>

      {reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          <p style={{ marginBottom: "1rem" }}>هنوز گزارشی ثبت نشده است.</p>
          <Link href="/audit" style={{ padding: "0.75rem 1.5rem", background: "#2563eb", color: "#fff", borderRadius: "0.5rem", textDecoration: "none", fontWeight: 600 }}>
            شروع ممیزی
          </Link>
        </div>
      ) : (
        <>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>آدرس</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>پروژه</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>امتیاز</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>یافته‌ها</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ</th>
                  <th style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const score = getScore(report);
                  const token = report.shares[0]?.token;
                  return (
                    <tr key={report.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {report.normalizedUrl ?? report.url}
                      </td>
                      <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                        {report.project?.name ?? "—"}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        {score != null ? (
                          <span style={{ fontWeight: 700, color: scoreColor(score) }}>{score}</span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        {report._count.findings}
                      </td>
                      <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                        {new Date(report.createdAt).toLocaleDateString("fa-IR")}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        {token ? (
                          <Link href={`/audit/r/${token}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                            مشاهده
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              {page > 1 && (
                <Link href={`?page=${page - 1}`} style={{ padding: "0.5rem 1rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", textDecoration: "none" }}>
                  قبلی
                </Link>
              )}
              <span style={{ padding: "0.5rem 1rem", color: "#6b7280" }}>
                صفحه {page} از {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`?page=${page + 1}`} style={{ padding: "0.5rem 1rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", textDecoration: "none" }}>
                  بعدی
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
