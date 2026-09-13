export function sanitizeMeasurementPath(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  const withoutQuery = raw.split(/[?#]/, 1)[0] || "/";
  const path = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return path
    .replace(/^(\/en)?\/audit\/r\/[^/]+(?=\/|$)/, "$1/audit/r/:token")
    .slice(0, 160);
}
