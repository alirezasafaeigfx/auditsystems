import { describe, expect, it } from "vitest";
import { getBlogPostBySlug } from "./index";

const TARGETS = [
  "website-audit-guide",
  "website-speed-test",
  "security-audit-guide",
  "technical-seo-issues",
] as const;

describe("AU-10 source-backed content contract", () => {
  it.each(TARGETS)("publishes sources and an honest Audit scope disclosure for %s", (slug) => {
    for (const locale of ["fa", "en"] as const) {
      const post = getBlogPostBySlug(slug, locale);

      expect(post?.sources.length).toBeGreaterThan(0);
      expect(post?.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
      expect(post?.content).toContain(locale === "fa" ? "محدوده ASDEV Audit" : "ASDEV Audit scope");
    }
  });

  it("does not present unsupported speed or security marketing claims", () => {
    const speed = getBlogPostBySlug("website-speed-test", "fa");
    const security = getBlogPostBySlug("security-audit-guide", "fa");

    expect(speed?.content).not.toContain("53% از کاربران موبایل");
    expect(speed?.content).not.toContain("نرخ تبدیل را 7% کاهش");
    expect(getBlogPostBySlug("website-speed-test", "en")?.content).not.toContain("53% of mobile users");
    expect(security?.description).not.toContain("تضمین کنید");
    expect(security?.content).not.toContain("43% از حملات سایبری");
    expect(getBlogPostBySlug("security-audit-guide", "en")?.content).not.toContain("43% of cyber attacks");
  });
});
