const DEFAULT_NEXT_PATH = "/app";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeNextPath(value: unknown, fallback = DEFAULT_NEXT_PATH): string {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (
    !candidate.startsWith("/")
    || candidate.startsWith("//")
    || candidate.includes("\\")
    || CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  try {
    const resolved = new URL(candidate, "https://auditsystems.invalid");
    if (resolved.origin !== "https://auditsystems.invalid") return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
