const DELIVERY_TIMEOUT_MS = 8_000;

export type TeamInviteDeliveryInput = {
  email: string;
  role: "ADMIN" | "VIEWER";
  organizationName: string;
  token: string;
  expiresAt: Date;
};

export class TeamInviteDeliveryError extends Error {
  constructor(public readonly code: "DELIVERY_NOT_CONFIGURED" | "DELIVERY_FAILED") {
    super(code);
    this.name = "TeamInviteDeliveryError";
  }
}

function requireDeliveryConfig(): { webhookUrl: URL; secret: string; siteUrl: URL } {
  const webhookValue = String(process.env.TEAM_INVITE_DELIVERY_WEBHOOK_URL ?? "").trim();
  const secret = String(process.env.TEAM_INVITE_DELIVERY_WEBHOOK_SECRET ?? "").trim();
  const siteValue = String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();

  if (!webhookValue || !secret || !siteValue) {
    throw new TeamInviteDeliveryError("DELIVERY_NOT_CONFIGURED");
  }

  let webhookUrl: URL;
  let siteUrl: URL;
  try {
    webhookUrl = new URL(webhookValue);
    siteUrl = new URL(siteValue);
  } catch {
    throw new TeamInviteDeliveryError("DELIVERY_NOT_CONFIGURED");
  }

  if (process.env.NODE_ENV === "production") {
    if (webhookUrl.protocol !== "https:" || siteUrl.protocol !== "https:") {
      throw new TeamInviteDeliveryError("DELIVERY_NOT_CONFIGURED");
    }
  } else if (!["http:", "https:"].includes(webhookUrl.protocol) || !["http:", "https:"].includes(siteUrl.protocol)) {
    throw new TeamInviteDeliveryError("DELIVERY_NOT_CONFIGURED");
  }

  return { webhookUrl, secret, siteUrl };
}

export async function deliverTeamInvite(input: TeamInviteDeliveryInput): Promise<void> {
  const { webhookUrl, secret, siteUrl } = requireDeliveryConfig();
  const inviteUrl = new URL("/app/team/accept", siteUrl);
  inviteUrl.searchParams.set("token", input.token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "TEAM_MEMBER_INVITE",
        email: input.email,
        role: input.role,
        organizationName: input.organizationName,
        expiresAt: input.expiresAt.toISOString(),
        inviteUrl: inviteUrl.toString(),
      }),
    });

    if (!response.ok) {
      throw new TeamInviteDeliveryError("DELIVERY_FAILED");
    }
  } catch (error) {
    if (error instanceof TeamInviteDeliveryError) throw error;
    throw new TeamInviteDeliveryError("DELIVERY_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
