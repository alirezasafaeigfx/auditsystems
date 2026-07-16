const EXACT_NO_INDEX_ROUTES = new Set([
  "/failed",
  "/en/failed",
  "/login",
  "/signup",
  "/verify-email"
]);

const NO_INDEX_ROUTE_PREFIXES = [
  "/admin",
  "/app",
  "/compare",
  "/audit/r",
  "/en/audit/r"
] as const;

function normalizePathname(pathname: string): string {
  const withoutQueryOrHash = pathname.split(/[?#]/, 1)[0] || "/";
  if (withoutQueryOrHash === "/") return "/";
  return withoutQueryOrHash.replace(/\/+$/, "") || "/";
}

export function isNoIndexRoute(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (EXACT_NO_INDEX_ROUTES.has(normalized)) return true;

  return NO_INDEX_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
