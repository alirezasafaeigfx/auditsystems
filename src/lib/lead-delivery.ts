import { AuditReportStatus, LeadStatus } from "@prisma/client";
import { normalizeAuditTargetUrl } from "./normalizeAuditTargetUrl";

export const LEAD_STATUSES = [
  LeadStatus.NEW,
  LeadStatus.QUALIFIED,
  LeadStatus.CALL,
  LeadStatus.PROPOSAL,
  LeadStatus.WON,
  LeadStatus.LOST,
] as const;

export const REPORT_STATUSES = [
  AuditReportStatus.QUEUED,
  AuditReportStatus.RUNNING,
  AuditReportStatus.REVIEW,
  AuditReportStatus.DELIVERED,
  AuditReportStatus.FAILED,
] as const;

export type LeadIntakeInput = {
  domain: string;
  contact: string;
  name?: string;
  phone?: string;
  company?: string;
  businessType: string;
  primaryConcern: string;
  consentPrivacy: boolean;
  leadSource?: string;
  sourcePlacement?: string;
  sourceOffer?: string;
  submitEventId?: string;
};

export type ValidatedLeadIntake = {
  domain: string;
  normalizedUrl: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  businessType: string;
  primaryConcern: string;
  consentPrivacy: boolean;
  leadSource: string;
  sourcePlacement?: string;
  sourceOffer?: string;
  submitEventId?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | undefined {
  const cleaned = cleanText(value, max);
  return cleaned || undefined;
}

export async function validateLeadIntake(body: unknown): Promise<
  | { ok: true; value: ValidatedLeadIntake }
  | { ok: false; error: string }
> {
  if (!body || typeof body !== "object") return { ok: false, error: "INVALID_PAYLOAD" };
  const input = body as Partial<LeadIntakeInput> & { website?: unknown; email?: unknown };

  const domain = cleanText(input.domain ?? input.website, 2048);
  const contact = cleanText(input.contact ?? input.email, 254).toLowerCase();
  const businessType = cleanText(input.businessType, 120);
  const primaryConcern = cleanText(input.primaryConcern, 1200);

  if (!domain) return { ok: false, error: "DOMAIN_REQUIRED" };
  if (!EMAIL_RE.test(contact)) return { ok: false, error: "VALID_EMAIL_REQUIRED" };
  if (!businessType) return { ok: false, error: "BUSINESS_TYPE_REQUIRED" };
  if (primaryConcern.length < 12) return { ok: false, error: "PRIMARY_CONCERN_TOO_SHORT" };
  if (input.consentPrivacy !== true) return { ok: false, error: "CONSENT_REQUIRED" };

  let normalizedUrl: string;
  try {
    const normalized = await normalizeAuditTargetUrl(domain, {
      verifyDnsPublicIp: String(process.env.AUDIT_DNS_GUARD ?? "true").toLowerCase() !== "false",
    });
    normalizedUrl = normalized.normalizedUrl;
  } catch {
    return { ok: false, error: "DOMAIN_NOT_PUBLICLY_REACHABLE" };
  }

  return {
    ok: true,
    value: {
      domain,
      normalizedUrl,
      email: contact,
      name: optionalText(input.name, 160),
      phone: optionalText(input.phone, 80),
      company: optionalText(input.company, 180),
      businessType,
      primaryConcern,
      consentPrivacy: true,
      leadSource: optionalText(input.leadSource, 80) ?? "direct",
      sourcePlacement: optionalText(input.sourcePlacement, 120),
      sourceOffer: optionalText(input.sourceOffer, 120),
      submitEventId: optionalText(input.submitEventId, 120),
    },
  };
}

export function parseLeadStatus(value: unknown): LeadStatus | null {
  return typeof value === "string" && LEAD_STATUSES.includes(value as LeadStatus) ? value as LeadStatus : null;
}

export function parseReportStatus(value: unknown): AuditReportStatus | null {
  return typeof value === "string" && REPORT_STATUSES.includes(value as AuditReportStatus) ? value as AuditReportStatus : null;
}
