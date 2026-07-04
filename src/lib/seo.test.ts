import { describe, expect, it } from "vitest";
import { parseSeoBasics } from "./seo";

describe("parseSeoBasics", () => {
  it("detects all SEO elements present", () => {
    const html = `
      <html>
        <head>
          <title>My Page</title>
          <meta name="description" content="A great page">
          <link rel="canonical" href="https://example.com/page">
          <meta property="og:title" content="My Page">
        </head>
      </html>
    `;
    const result = parseSeoBasics(html);
    expect(result).toEqual({
      title: true,
      metaDescription: true,
      canonical: true,
      openGraph: true,
    });
  });

  it("detects no SEO elements in empty HTML", () => {
    const result = parseSeoBasics("<html><head></head></html>");
    expect(result).toEqual({
      title: false,
      metaDescription: false,
      canonical: false,
      openGraph: false,
    });
  });

  it("detects title tag with various attributes", () => {
    expect(parseSeoBasics('<title lang="en">Test</title>').title).toBe(true);
    expect(parseSeoBasics("<TITLE>Test</TITLE>").title).toBe(true);
  });

  it("detects meta description with single quotes", () => {
    const html = "<meta name='description' content='desc'>";
    expect(parseSeoBasics(html).metaDescription).toBe(true);
  });

  it("detects canonical link with different formats", () => {
    expect(parseSeoBasics('<link rel="canonical" href="https://example.com">').canonical).toBe(true);
    expect(parseSeoBasics("<link rel='canonical' href='https://example.com'>").canonical).toBe(true);
  });

  it("detects openGraph with different og: properties", () => {
    const ogTypes = ["og:title", "og:description", "og:image", "og:url", "og:type"];
    for (const prop of ogTypes) {
      expect(parseSeoBasics(`<meta property="${prop}" content="val">`).openGraph).toBe(true);
    }
  });

  it("returns false for partial matches", () => {
    expect(parseSeoBasics("<div>Title is not a tag</div>").title).toBe(false);
    expect(parseSeoBasics('<meta name="og:title" content="x">').openGraph).toBe(false);
  });

  it("is case insensitive for tag names", () => {
    expect(parseSeoBasics("<TITLE>Test</TITLE>").title).toBe(true);
    expect(parseSeoBasics('<META name="description" content="d">').metaDescription).toBe(true);
  });

  it("handles malformed HTML gracefully", () => {
    const result = parseSeoBasics("not html at all <b>bold</b>");
    expect(result.title).toBe(false);
    expect(result.metaDescription).toBe(false);
    expect(result.canonical).toBe(false);
    expect(result.openGraph).toBe(false);
  });

  it("handles multiple meta description tags (detects first match)", () => {
    const html = `
      <meta name="description" content="first">
      <meta name="description" content="second">
    `;
    expect(parseSeoBasics(html).metaDescription).toBe(true);
  });
});
