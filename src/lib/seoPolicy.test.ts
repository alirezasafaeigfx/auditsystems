import { describe, expect, it } from "vitest";
import { isNoIndexRoute } from "./seoPolicy";

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
    "/en/failed"
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
