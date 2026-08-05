import { describe, it, expect } from "vitest";
import {
  analyzeContent,
  generateContentFindings,
} from "./content-analysis";
import type { AuditContext } from "./types";

function createContext(html: string, url = "https://example.com/"): AuditContext {
  return {
    target: { url, normalizedUrl: url },
    main: { html, response: { status: 200 }, timings: {} },
    links: { internal: [], external: [] },
    assets: { css: [], js: [], images: [] },
    schema: { found: [], graph: {} },
    opengraph: {},
    performance: { field: {}, lab: {} },
    security: {},
    accessibility: {},
    seo: {},
    content: {},
  } as unknown as AuditContext;
}

describe("content-analysis", () => {
  describe("detectLanguageFromHtml", () => {
    it("detects Persian content with HTML lang attribute", () => {
      const html = `<html lang="fa-IR" dir="rtl"><head><title>تست</title></head><body>
        <p>این یک متن فارسی است که برای تست زبان استفاده می‌شود.</p>
        <p>محتوای فارسی با کاراکترهای خاص فارسی مانند پ چ ژ ک گ ی</p>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.language.language).toBe("fa");
      expect(result.language.direction).toBe("rtl");
      expect(result.language.confidence).toBeGreaterThan(0.6);
    });

    it("detects English content", () => {
      const html = `<html lang="en"><head><title>Test</title></head><body>
        <p>This is English content for testing language detection.</p>
        <p>More English text here with proper grammar and structure.</p>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.language.language).toBe("en");
      expect(result.language.direction).toBe("ltr");
    });

    it("detects mixed language content", () => {
      const html = `<html lang="fa"><head><title>Test</title></head><body>
        <p>این محتوای فارسی است</p>
        <p>This is English content mixed with Persian</p>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(["mixed", "fa", "en"]).toContain(result.language.language);
    });
  });

  describe("pageType classification", () => {
    it("classifies homepage", () => {
      const html = `<html><head><title>Home</title></head><body><h1>Home Page</h1></body></html>`;
      const ctx = createContext(html, "https://example.com/");
      const result = analyzeContent(ctx);

      expect(result.pageType).toBe("homepage");
    });

    it("classifies service page", () => {
      const html = `<html><head><title>Services</title></head><body><h1>Our Services</h1></body></html>`;
      const ctx = createContext(html, "https://example.com/services");
      const result = analyzeContent(ctx);

      expect(result.pageType).toBe("service");
    });

    it("classifies Persian service page", () => {
      const html = `<html lang="fa"><head><title>خدمات</title></head><body><h1>خدمات ما</h1></body></html>`;
      const ctx = createContext(html, "https://example.com/services");
      const result = analyzeContent(ctx);

      expect(result.pageType).toBe("service");
    });

    it("classifies article page", () => {
      const html = `<html><head><title>Blog Post</title></head><body><h1>Article Title</h1></body></html>`;
      const ctx = createContext(html, "https://example.com/blog/my-post");
      const result = analyzeContent(ctx);

      expect(result.pageType).toBe("article");
    });
  });

  describe("content extraction", () => {
    it("extracts content metrics", () => {
      const html = `<html><head><title>Test</title></head><body>
        <h1>Main Title</h1>
        <h2>Subtitle 1</h2>
        <p>First paragraph with some content.</p>
        <h2>Subtitle 2</h2>
        <p>Second paragraph with more content.</p>
        <ul><li>Item 1</li><li>Item 2</li></ul>
        <table><tr><td>Data</td></tr></table>
        <a href="/link">Link</a>
        <img src="/image.jpg" alt="Image">
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.content.headingCount).toBe(3);
      expect(result.content.paragraphs).toBe(2);
      expect(result.content.listCount).toBe(1);
      expect(result.content.tableCount).toBe(1);
      expect(result.content.linkCount).toBe(1);
      expect(result.content.imageCount).toBe(1);
    });
  });

  describe("author signals", () => {
    it("detects author meta tag", () => {
      const html = `<html><head><meta name="author" content="John Doe"></head><body></body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.author.hasAuthorName).toBe(true);
      expect(result.author.authorNames).toContain("John Doe");
    });

    it("detects author schema", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Article","author":{"@type":"Person","name":"Jane Doe"}}</script>
      </head><body></body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.author.hasAuthorSchema).toBe(true);
    });
  });

  describe("organization signals", () => {
    it("detects organization schema", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Test Corp"}</script>
      </head><body></body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.organization.hasOrganizationSchema).toBe(true);
    });

    it("detects contact information", () => {
      const html = `<html><body>
        <a href="mailto:info@example.com">Email</a>
        <a href="tel:+1234567890">Phone</a>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.organization.hasContactInfo).toBe(true);
      expect(result.organization.hasEmail).toBe(true);
      expect(result.organization.hasPhone).toBe(true);
    });
  });

  describe("trust signals", () => {
    it("detects privacy policy link", () => {
      const html = `<html><body>
        <a href="/privacy">Privacy Policy</a>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.trust.hasPrivacyPolicy).toBe(true);
    });

    it("detects Persian privacy policy", () => {
      const html = `<html lang="fa"><body>
        <a href="/privacy">سیاست حریم خصوصی</a>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.trust.hasPrivacyPolicy).toBe(true);
    });
  });

  describe("citation signals", () => {
    it("detects external citations", () => {
      const html = `<html><body>
        <a href="https://example1.com">Source 1</a>
        <a href="https://example2.com">Source 2</a>
        <a href="https://example3.com">Source 3</a>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.citations.hasExternalCitations).toBe(true);
      expect(result.citations.citationCount).toBe(3);
    });

    it("detects statistics", () => {
      const html = `<html><body>
        <p>این محصول ۸۵٪ رضایت مشتری دارد</p>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.citations.hasStatistics).toBe(true);
    });
  });

  describe("E-E-A-T proxy assessment", () => {
    it("scores high E-E-A-T for comprehensive content", () => {
      const longParagraph = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(15);
      const html = `<html lang="en"><head>
        <meta name="author" content="Expert Author">
        <script type="application/ld+json">{"@type":"Organization","name":"Test Corp"}</script>
      </head><body>
        <h1>Comprehensive Guide</h1>
        <h2>Section 1</h2>
        <p>${longParagraph}</p>
        <h2>Section 2</h2>
        <p>${longParagraph}</p>
        <h2>Section 3</h2>
        <p>${longParagraph}</p>
        <div class="author-bio">Expert Author is a specialist in the field.</div>
        <a href="https://source1.com">Source 1</a>
        <a href="https://source2.com">Source 2</a>
        <a href="https://source3.com">Source 3</a>
        <a href="https://source4.com">Source 4</a>
        <a href="https://source5.com">Source 5</a>
        <a href="https://source6.com">Source 6</a>
        <p>Statistics show 85% improvement</p>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.eeat.experience.score).toBe("present");
      expect(result.eeat.expertise.score).toBe("present");
      expect(result.eeat.authoritativeness.score).toBe("present");
      expect(result.eeat.trust.score).toBe("present");
    });

    it("scores low E-E-A-T for minimal content", () => {
      const html = `<html><body>
        <p>Short content</p>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.eeat.experience.score).toBe("absent");
      expect(result.eeat.expertise.score).toBe("absent");
      expect(result.eeat.authoritativeness.score).toBe("absent");
      expect(result.eeat.trust.score).toBe("absent");
    });
  });

  describe("generateContentFindings", () => {
    it("generates findings for thin content", () => {
      const html = `<html><body><p>Short</p></body></html>`;
      const ctx = createContext(html);
      const analysis = analyzeContent(ctx);
      const findings = generateContentFindings(analysis);

      expect(findings.some((f) => f.title.includes("thin"))).toBe(true);
    });

    it("generates findings for missing privacy policy", () => {
      const html = `<html><body><p>${"Content ".repeat(100)}</p></body></html>`;
      const ctx = createContext(html);
      const analysis = analyzeContent(ctx);
      const findings = generateContentFindings(analysis);

      expect(findings.some((f) => f.title.includes("Privacy"))).toBe(true);
    });
  });

  describe("coverage and confidence", () => {
    it("calculates coverage based on signals", () => {
      const html = `<html lang="en"><head>
        <meta name="author" content="Author">
        <script type="application/ld+json">{"@type":"Organization","name":"Corp"}</script>
      </head><body>
        <p>Content with enough words to pass threshold and be meaningful. ${"Word ".repeat(100)}</p>
        <a href="https://source.com">Source</a>
        <a href="/privacy">Privacy</a>
        <a href="/contact">Contact</a>
      </body></html>`;
      const ctx = createContext(html);
      const result = analyzeContent(ctx);

      expect(result.coverage).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});
