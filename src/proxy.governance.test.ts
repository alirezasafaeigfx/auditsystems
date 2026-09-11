import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { proxy } from "./proxy";

const ROADMAP_PATH = fileURLToPath(new URL("../ops/roadmap/phases.json", import.meta.url));
const EXPECTED_ROADMAP_COMMAND = "pnpm exec vitest run src/proxy.governance.test.ts";

function makeRequest(pathname: string, options?: { authenticated?: boolean; proto?: "http" | "https" }) {
  const headers = new Headers();
  headers.set("x-forwarded-proto", options?.proto ?? "https");
  if (options?.authenticated) {
    headers.set("cookie", "saas_session=test-session");
  }

  return new NextRequest(`https://audit.example.test${pathname}`, { headers });
}

function expectGlobalSecurityHeaders(response: NextResponse) {
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
  expect(response.headers.get("permissions-policy")).toContain("camera=()");
  expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  expect(response.headers.get("cross-origin-resource-policy")).toBe("same-site");
  expect(response.headers.get("x-dns-prefetch-control")).toBe("off");
  expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  expect(response.headers.get("strict-transport-security")).toContain("max-age=31536000");
}

describe("canonical edge security proxy", () => {
  it("fails closed for unauthenticated /app requests and keeps security policy on the redirect", () => {
    const response = proxy(makeRequest("/app/projects"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "", "https://audit.example.test");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/app/projects");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expectGlobalSecurityHeaders(response);
  });

  it("preserves the authenticated /app path while applying locale, cache and security controls", () => {
    const response = proxy(makeRequest("/app/projects", { authenticated: true }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-asdev-locale")).toBe("fa");
    expect(response.headers.get("x-site-locale")).toBe("fa");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expectGlobalSecurityHeaders(response);
  });

  it("propagates English locale and public indexability on /en", () => {
    const response = proxy(makeRequest("/en"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-asdev-locale")).toBe("en");
    expect(response.headers.get("x-site-locale")).toBe("en");
    expect(response.headers.get("x-robots-tag")).toBe("all");
    expect(response.headers.get("cache-control")).toContain("public");
    expectGlobalSecurityHeaders(response);
  });

  it("wires the Roadmap check to the semantic proxy regression instead of a path-only grep", () => {
    const roadmap = JSON.parse(readFileSync(ROADMAP_PATH, "utf8")) as {
      phases: Array<{ id: string; checks: Array<{ id: string; command: string }> }>;
    };
    const excellence = roadmap.phases.find((phase) => phase.id === "H");
    const edgeCheck = excellence?.checks.find((check) => check.id === "edge-security-middleware");

    expect(edgeCheck?.command).toBe(EXPECTED_ROADMAP_COMMAND);
    expect(edgeCheck?.command).not.toContain("test -f proxy.ts");
    expect(edgeCheck?.command).not.toContain("grep");
  });
});
