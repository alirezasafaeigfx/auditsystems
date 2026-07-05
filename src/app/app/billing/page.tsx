import { prisma } from "../../../lib/db";
import { validateSession, getOrganizationForUser } from "../../../lib/auth";
import { getUsageStats } from "../../../lib/usage";
import { PLANS, getPlanComparison, formatPriceToman, isPaidPlan, type PlanCode } from "../../../lib/plans";
import { CheckoutButton } from "../../../components/CheckoutButton";

export const metadata = {
  title: "اشتراک و صورتحساب"
};

async function getActiveSubscription(organizationId: string) {
  return prisma.subscription.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
}

async function getRecentInvoices(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
    take: 5
  });
}

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams;
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const usage = await getUsageStats(org.id);
  const subscription = await getActiveSubscription(org.id);
  const invoices = await getRecentInvoices(org.id);
  const comparison = getPlanComparison();

  const currentPlanCode = subscription?.plan.code ?? "free";
  const currentPlan = PLANS[currentPlanCode as PlanCode] ?? PLANS.free;

  const invoiceStatusLabels: Record<string, string> = {
    PAID: "پرداخت شده",
    PENDING: "در انتظار",
    FAILED: "ناموفق",
    CANCELED: "لغو شده"
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>اشتراک و صورتحساب</h1>

      {params.status === "success" && (
        <div style={{ padding: "1rem", background: "var(--brand-bg, #d1fae5)", border: "1px solid #6ee7b7", borderRadius: "0.5rem", marginBottom: "1.5rem", color: "var(--brand-strong, #065f46)" }}>
          پرداخت با موفقیت انجام شد! اشتراک شما فعال شد.
        </div>
      )}
      {params.status === "failed" && (
        <div style={{ padding: "1rem", background: "var(--danger-bg, #fee2e2)", border: "1px solid #fca5a5", borderRadius: "0.5rem", marginBottom: "1.5rem", color: "var(--danger, #991b1b)" }}>
          پرداخت تأیید نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.
        </div>
      )}

      <div style={{ padding: "1.5rem", background: "var(--brand-bg, #f0fdf4)", border: "1px solid #bbf7d0", borderRadius: "0.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>پلن فعلی</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{currentPlan.name}</div>
            {!isPaidPlan(currentPlanCode as PlanCode) && (
              <div style={{ fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>رایگان — نیازی به پرداخت نیست</div>
            )}
            {isPaidPlan(currentPlanCode as PlanCode) && subscription && (
              <div style={{ fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>
                تمدید: {new Date(subscription.currentPeriodEnd).toLocaleDateString("fa-IR")}
              </div>
            )}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{formatPriceToman(currentPlan.priceMonthlyToman)}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>ماهانه</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>پروژه‌ها</div>
            <div style={{ fontWeight: 600 }}>{usage.projectCount} / {usage.projectLimit}</div>
            <div style={{ height: "4px", background: "var(--border, #e5e7eb)", borderRadius: "2px", marginTop: "4px" }}>
              <div style={{ height: "100%", background: "var(--brand, #0f7a66)", borderRadius: "2px", width: `${Math.min(100, (usage.projectCount / usage.projectLimit) * 100)}%` }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>ممیزی این ماه</div>
            <div style={{ fontWeight: 600 }}>{usage.auditCount} / {usage.auditLimit}</div>
            <div style={{ height: "4px", background: "var(--border, #e5e7eb)", borderRadius: "2px", marginTop: "4px" }}>
              <div style={{ height: "100%", background: "var(--brand, #0f7a66)", borderRadius: "2px", width: `${Math.min(100, (usage.auditCount / usage.auditLimit) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>مقایسه پلن‌ها</h2>
      <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden", marginBottom: "2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
              <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>ویژگی</th>
              {comparison.map((p) => (
                <th key={p.plan} style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>{p.plan}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
              <td style={{ padding: "0.75rem" }}>قیمت / ماه</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{formatPriceToman(p.price)}</td>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
              <td style={{ padding: "0.75rem" }}>پروژه‌ها</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.projects}</td>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
              <td style={{ padding: "0.75rem" }}>ممیزی / ماه</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.audits}</td>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
              <td style={{ padding: "0.75rem" }}>خروجی PDF</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.pdf ? "✓" : "—"}</td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: "0.75rem" }}>ممیزی زمان‌بندی شده</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.scheduled ? "✓" : "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          return (
            <div key={plan.code} className="card" style={{
              border: isCurrent ? "2px solid var(--brand, #0f7a66)" : undefined,
              padding: "1.5rem",
              position: "relative"
            }}>
              {isCurrent && (
                <span style={{ position: "absolute", top: "-0.75rem", left: "1rem", background: "var(--brand, #0f7a66)", color: "#fff", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600 }}>
                  پلن فعلی
                </span>
              )}
              <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.25rem" }}>{plan.name}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>{formatPriceToman(plan.priceMonthlyToman)}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>
                <li style={{ marginBottom: "0.25rem" }}>{plan.projectLimit} پروژه</li>
                <li style={{ marginBottom: "0.25rem" }}>{plan.monthlyAuditLimit} ممیزی در ماه</li>
                <li style={{ marginBottom: "0.25rem" }}>خروجی PDF: {plan.pdfExport ? "✓" : "—"}</li>
                <li>ممیزی زمان‌بندی شده: {plan.scheduledAudits ? "✓" : "—"}</li>
              </ul>
              {!isCurrent && isPaidPlan(plan.code) && (
                <div style={{ marginTop: "1rem" }}>
                  <CheckoutButton planCode={plan.code} label={plan.upgradeCta} />
                </div>
              )}
              {isCurrent && (
                <div style={{ marginTop: "1rem", padding: "0.5rem", background: "var(--brand-bg, #f0fdf4)", borderRadius: "0.375rem", textAlign: "center", fontSize: "0.875rem", color: "var(--brand-strong, #065f46)", fontWeight: 600 }}>
                  فعال
                </div>
              )}
            </div>
          );
        })}
      </div>

      {invoices.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>تاریخچه صورتحساب</h2>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden", marginBottom: "2rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>پلن</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>مبلغ</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "0.75rem" }}>{new Date(inv.createdAt).toLocaleDateString("fa-IR")}</td>
                    <td style={{ padding: "0.75rem" }}>{inv.plan.name}</td>
                    <td style={{ padding: "0.75rem" }}>{formatPriceToman(inv.amountToman)}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className={`badge ${inv.status === "PAID" ? "sev-low" : inv.status === "FAILED" ? "sev-critical" : "sev-medium"}`}>
                        {invoiceStatusLabels[inv.status] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
