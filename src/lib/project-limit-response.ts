export type ProjectLimitResponse = {
  error: "PROJECT_LIMIT_REACHED";
  usage: { current: number; limit: number };
  upgradeUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUsageCount(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0;
}

function isSafeUpgradeUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/app/")) {
    return false;
  }

  const applicationOrigin = "https://audit.local";

  try {
    const url = new URL(value, applicationOrigin);
    return url.origin === applicationOrigin && url.pathname.startsWith("/app/");
  } catch {
    return false;
  }
}

export function parseProjectLimitResponse(value: unknown): ProjectLimitResponse | null {
  if (!isRecord(value) || value.error !== "PROJECT_LIMIT_REACHED" || !isRecord(value.usage)) {
    return null;
  }

  const { current, limit } = value.usage;

  if (!isUsageCount(current) || !isUsageCount(limit) || !isSafeUpgradeUrl(value.upgradeUrl)) {
    return null;
  }

  return {
    error: "PROJECT_LIMIT_REACHED",
    usage: { current, limit },
    upgradeUrl: value.upgradeUrl,
  };
}
