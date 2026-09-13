import { describe, expect, it } from "vitest";
import { isNoIndexRoute, isPublicNoIndexRoute } from "./seoPolicy";

describe("isNoIndexRoute", () => {
  it.each([
    "/admin",
    "/admin/monitoring",
    "/app",
    "/app/projects/123",
    "/compare/token-a/token-b",
    "/audit/r/token",
    "/en/audit/r/token",
    "/login",
    "/signup/",
    "/verify-email?token=redacted",
    "/failed",
    "/en/failed",
    "/asdev",
    "/brand/asdev-portfolio",
    "/en/brand/asdev-portfolio"
  ])("classifies private and utility route %s as noindex", (pathname) => {
    expect(isNoIndexRoute(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/en",
    "/audit",
    "/en/audit",
    "/audit-readiness",
    "/application",
    "/administer",
    "/comparison",
    "/blog"
  ])("keeps public route %s indexable", (pathname) => {
    expect(isNoIndexRoute(pathname)).toBe(false);
  });
});

describe("isPublicNoIndexRoute", () => {
  it.each([
    "/asdev",
    "/brand/asdev-portfolio",
    "/en/brand/asdev-portfolio",
  ])("classifies crawlable noindex route %s", (pathname) => {
    expect(isPublicNoIndexRoute(pathname)).toBe(true);
  });

  it.each(["/failed", "/audit/r/token", "/admin"])('keeps private noindex route %s out of the public set', (pathname) => {
    expect(isPublicNoIndexRoute(pathname)).toBe(false);
  });
});
