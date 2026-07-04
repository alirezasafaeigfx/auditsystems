import { validateSession, getOrganizationForUser } from "../../../lib/auth";
import { getUsageStats } from "../../../lib/usage";
import { PLANS, getPlanComparison } from "../../../lib/plans";

export default async function BillingPage() {
  const user = await validateSession();
  if (!user) return null;

  const membership = await getOrganizationForUser(user.id);
  const org = membership?.organization;
  if (!org) return null;

  const usage = await getUsageStats(org.id);
  const comparison = getPlanComparison();

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Billing & Plans</h1>

      <div style={{ padding: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Current Plan</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{usage.plan.name}</div>
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>No payment required</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Projects</div>
            <div style={{ fontWeight: 600 }}>{usage.projectCount} / {usage.projectLimit}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Audits this month</div>
            <div style={{ fontWeight: 600 }}>{usage.auditCount} / {usage.auditLimit}</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Compare Plans</h2>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", marginBottom: "2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "0.75rem", fontWeight: 600 }}>Feature</th>
              {comparison.map((p) => (
                <th key={p.plan} style={{ textAlign: "center", padding: "0.75rem", fontWeight: 600 }}>{p.plan}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.75rem" }}>Projects</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.projects}</td>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.75rem" }}>Audits / month</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.audits}</td>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.75rem" }}>PDF Export</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.pdf ? "✓" : "—"}</td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: "0.75rem" }}>Scheduled Audits</td>
              {comparison.map((p) => (
                <td key={p.plan} style={{ textAlign: "center", padding: "0.75rem" }}>{p.scheduled ? "✓" : "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.code === usage.plan.code;
          return (
            <div key={plan.code} style={{
              border: isCurrent ? "2px solid #0f7a66" : "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              position: "relative"
            }}>
              {isCurrent && (
                <span style={{ position: "absolute", top: "-0.75rem", left: "1rem", background: "#0f7a66", color: "#fff", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600 }}>
                  Current Plan
                </span>
              )}
              <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>{plan.name}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                <li style={{ marginBottom: "0.25rem" }}>{plan.projectLimit} project{plan.projectLimit > 1 ? "s" : ""}</li>
                <li style={{ marginBottom: "0.25rem" }}>{plan.monthlyAuditLimit} audits/month</li>
                <li style={{ marginBottom: "0.25rem" }}>PDF export: {plan.pdfExport ? "✓" : "—"}</li>
                <li>Scheduled audits: {plan.scheduledAudits ? "✓" : "—"}</li>
              </ul>
              <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#9ca3af" }}>{plan.billingNote}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Ready to upgrade?</p>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Paid plans are coming soon. Contact us to get early access.
        </p>
        <a href="mailto:team@alirezasafaeisystems.ir" style={{ display: "inline-block", background: "#0f7a66", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", textDecoration: "none", fontWeight: 600 }}>
          Contact Us
        </a>
      </div>
    </div>
  );
}
