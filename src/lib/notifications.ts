import { prisma } from "./db";
import { logEvent } from "./observability";

export type AuditCompletionData = {
  auditId: string;
  url: string;
  score: number;
  grade: string;
  totalFindings: number;
  severityCounts: Record<string, number>;
  categoryScores: Record<string, number>;
};

export async function sendAuditCompleteNotification(
  userId: string,
  auditData: AuditCompletionData
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          notificationPreference: true
        }
      },
      user: { select: { email: true, name: true } }
    }
  });

  if (!membership) return false;

  const org = membership.organization;
  const pref = org.notificationPreference;

  if (!pref?.emailEnabled) {
    logEvent("info", "notification_skipped_disabled", {
      organizationId: org.id,
      auditId: auditData.auditId
    });
    return false;
  }

  const email = membership.user?.email;
  if (!email) {
    logEvent("warn", "notification_no_email", {
      organizationId: org.id,
      auditId: auditData.auditId
    });
    return false;
  }

  const subject = `ممیزی تکمیل شد — امتیاز: ${auditData.score}/100`;
  const body = renderEmailBody(org.name, auditData, org.id);

  // Email service integration placeholder
  // When integrating with an email provider, replace this console.log with actual sending
  console.log(
    JSON.stringify({
      event: "audit_complete_email",
      to: email,
      subject,
      body,
      auditId: auditData.auditId,
      organizationId: org.id
    })
  );

  logEvent("info", "notification_email_sent", {
    organizationId: org.id,
    auditId: auditData.auditId,
    email
  });

  await prisma.notificationHistory.create({
    data: {
      organizationId: org.id,
      type: "AUDIT_COMPLETE",
      subject,
      body,
      email
    }
  });

  return true;
}

function renderEmailBody(
  orgName: string,
  data: AuditCompletionData,
  organizationId: string
): string {
  const severityLines = Object.entries(data.severityCounts)
    .filter(([, count]) => count > 0)
    .map(([sev, count]) => `  - ${sev}: ${count}`)
    .join("\n");

  const categoryLines = Object.entries(data.categoryScores)
    .map(([cat, score]) => `  - ${cat}: ${score}/100`)
    .join("\n");

  const unsubscribeToken = Buffer.from(`unsub:${organizationId}`).toString("base64");
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://auditsystems.ir"}/api/notifications/unsubscribe?token=${unsubscribeToken}`;

  return [
    `ASDEV Audit Platform — Audit Complete`,
    ``,
    `Organization: ${orgName}`,
    `URL: ${data.url}`,
    ``,
    `Score: ${data.score}/100 (${data.grade})`,
    `Total Findings: ${data.totalFindings}`,
    ``,
    `Severity Distribution:`,
    severityLines || "  (none)",
    ``,
    `Category Scores:`,
    categoryLines,
    ``,
    `View report: ${process.env.NEXT_PUBLIC_APP_URL || "https://auditsystems.ir"}/app`,
    ``,
    `---`,
    `To unsubscribe: ${unsubscribeUrl}`
  ].join("\n");
}
