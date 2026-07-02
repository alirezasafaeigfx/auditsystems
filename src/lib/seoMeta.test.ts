import { describe, expect, it } from "vitest";
import {
  buildPageMetadata,
  buildLocaleAlternates,
  buildNoIndexMetadata,
  buildBreadcrumbSchema,
  buildArticleSchema,
} from "./seoMeta";

const SITE_URL = "https://audit.alirezasafaeisystems.ir";

describe("buildPageMetadata", () => {
  it("builds metadata for FA page", () => {
    const meta = buildPageMetadata({
      locale: "fa",
      path: "/audit",
      title: "ارزیابی سایت",
      description: "بررسی فنی سایت شما",
    });
    expect(meta.title).toBe("ارزیابی سایت");
    expect(meta.description).toBe("بررسی فنی سایت شما");
    expect(meta.alternates?.canonical).toContain("/audit");
    expect(meta.openGraph?.title).toBe("ارزیابی سایت");
  });

  it("builds metadata for EN page", () => {
    const meta = buildPageMetadata({
      locale: "en",
      path: "/audit",
      title: "Site Audit",
      description: "Check your site",
    });
    expect(meta.title).toBe("Site Audit");
    expect(meta.alternates?.canonical).toContain("/en/audit");
  });

  it("includes keywords when provided", () => {
    const meta = buildPageMetadata({
      locale: "fa",
      path: "/",
      title: "Home",
      description: "Home page",
      keywords: ["audit", "seo"],
    });
    expect(meta.keywords).toEqual(["audit", "seo"]);
  });

  it("excludes keywords when not provided", () => {
    const meta = buildPageMetadata({
      locale: "fa",
      path: "/",
      title: "Home",
      description: "Home page",
    });
    expect(meta.keywords).toBeUndefined();
  });
});

describe("buildLocaleAlternates", () => {
  it("generates correct alternates for FA path", () => {
    const alternates = buildLocaleAlternates("/audit", "fa");
    expect(alternates.languages?.["fa-IR"]).toContain("/audit");
    expect(alternates.languages?.["en-US"]).toContain("/en/audit");
    expect(alternates.languages?.["x-default"]).toContain("/audit");
  });

  it("generates correct alternates for root path", () => {
    const alternates = buildLocaleAlternates("/", "fa");
    expect(alternates.languages?.["fa-IR"]).toBe(SITE_URL + "/");
    expect(alternates.languages?.["en-US"]).toBe(SITE_URL + "/en");
  });
});

describe("buildNoIndexMetadata", () => {
  it("builds noindex metadata", () => {
    const meta = buildNoIndexMetadata();
    expect(meta.robots).toBeDefined();
  });

  it("includes optional title and description", () => {
    const meta = buildNoIndexMetadata({ title: "Hidden", description: "Not indexed" });
    expect(meta.title).toBe("Hidden");
    expect(meta.description).toBe("Not indexed");
  });
});

describe("buildBreadcrumbSchema", () => {
  it("generates valid breadcrumb schema", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Audit", path: "/audit" },
    ]);
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
  });
});

describe("buildArticleSchema", () => {
  it("generates valid article schema", () => {
    const schema = buildArticleSchema({
      title: "Test Article",
      description: "A test",
      path: "/guides/test",
      inLanguage: "en-US",
      datePublished: "2026-01-01",
    });
    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe("Test Article");
    expect(schema.dateModified).toBe("2026-01-01");
    expect(schema.author["@type"]).toBe("Organization");
  });

  it("uses dateModified when provided", () => {
    const schema = buildArticleSchema({
      title: "Test",
      description: "A test",
      path: "/test",
      inLanguage: "fa-IR",
      datePublished: "2026-01-01",
      dateModified: "2026-06-01",
    });
    expect(schema.dateModified).toBe("2026-06-01");
  });
});
