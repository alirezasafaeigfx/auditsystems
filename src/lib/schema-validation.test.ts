import { describe, it, expect } from "vitest";
import { validateStructuredData, generateSchemaFindings } from "./schema-validation";
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

describe("schema-validation", () => {
  describe("parse JSON-LD", () => {
    it("parses valid JSON-LD", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Corp","url":"https://acme.com"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.syntaxValid).toBe(true);
      expect(result.schemaOrg).toHaveLength(1);
      expect(result.schemaOrg[0].type).toBe("Organization");
    });

    it("handles malformed JSON-LD without crashing", () => {
      const html = `<html><head>
        <script type="application/ld+json">{invalid json</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.syntaxValid).toBe(false);
      expect(result.syntaxErrors.length).toBeGreaterThan(0);
    });

    it("parses @graph arrays", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@graph":[{"@type":"Organization","name":"Org1"},{"@type":"WebSite","name":"Site1","url":"https://site1.com"}]}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg).toHaveLength(2);
      expect(result.schemaOrg[0].type).toBe("Organization");
      expect(result.schemaOrg[1].type).toBe("WebSite");
    });

    it("parses top-level arrays", () => {
      const html = `<html><head>
        <script type="application/ld+json">[{"@type":"Product","name":"Widget"},{"@type":"Offer","price":"9.99","priceCurrency":"USD"}]</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg).toHaveLength(2);
    });
  });

  describe("parse microdata", () => {
    it("parses microdata itemscope", () => {
      const html = `<html><body>
        <div itemscope itemtype="https://schema.org/Organization">
          <span itemprop="name">Acme Corp</span>
        </div>
      </body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg).toHaveLength(1);
      expect(result.schemaOrg[0].type).toBe("Organization");
    });
  });

  describe("parse RDFa", () => {
    it("parses RDFa typeof", () => {
      const html = `<html><body>
        <div typeof="Organization">
          <span property="name">Acme Corp</span>
        </div>
      </body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg).toHaveLength(1);
      expect(result.schemaOrg[0].type).toBe("Organization");
    });
  });

  describe("Schema.org validation", () => {
    it("detects missing required properties", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Product"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg[0].missingRequired).toContain("name");
    });

    it("detects deprecated types", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"ProductOffer","name":"Test"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg[0].isDeprecated).toBe(true);
    });

    it("validates complete Article schema", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Article","headline":"Test","image":"https://img.com/test.jpg","author":{"@type":"Person","name":"Author"},"datePublished":"2024-01-01","dateModified":"2024-01-02"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg[0].missingRequired).toHaveLength(0);
      expect(result.schemaOrg[0].isValidType).toBe(true);
    });

    it("validates complete Organization schema", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme","url":"https://acme.com","logo":"https://acme.com/logo.png","sameAs":["https://twitter.com/acme"]}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg[0].missingRequired).toHaveLength(0);
    });

    it("validates LocalBusiness with required props", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"LocalBusiness","name":"Shop","address":{"@type":"PostalAddress","streetAddress":"123 Main St"},"telephone":"+1234567890"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.schemaOrg[0].missingRequired).toHaveLength(0);
    });
  });

  describe("Google eligibility", () => {
    it("identifies Article rich result eligibility", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Article","headline":"Test Article","image":"https://img.com/test.jpg"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      const article = result.googleEligibility.find((g) => g.feature === "Article");
      expect(article).toBeDefined();
      expect(article!.isEligible).toBe(true);
    });

    it("identifies missing properties for rich result", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Article","description":"Just a description"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      const article = result.googleEligibility.find((g) => g.feature === "Article");
      expect(article).toBeDefined();
      expect(article!.isEligible).toBe(false);
      expect(article!.missingRequired).toContain("headline");
      expect(article!.missingRequired).toContain("image");
    });

    it("identifies Product rich result eligibility", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Product","name":"Widget","image":"https://img.com/widget.jpg"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      const product = result.googleEligibility.find((g) => g.feature === "Product");
      expect(product).toBeDefined();
      expect(product!.isEligible).toBe(true);
    });
  });

  describe("conflict detection", () => {
    it("detects conflicting organization names", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Corp"}</script>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Inc"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.conflicts.hasConflict).toBe(true);
      expect(result.conflicts.conflicts.some((c) => c.property === "organization")).toBe(true);
    });

    it("detects multiple authors", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Article","headline":"A","author":{"@type":"Person","name":"Alice"}}</script>
        <script type="application/ld+json">{"@type":"Article","headline":"B","author":{"@type":"Person","name":"Bob"}}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.conflicts.hasConflict).toBe(true);
      expect(result.conflicts.conflicts.some((c) => c.property === "author")).toBe(true);
    });

    it("no conflicts with consistent data", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Corp","url":"https://acme.com"}</script>
        <script type="application/ld+json">{"@type":"WebSite","name":"Acme Corp","url":"https://acme.com"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.conflicts.hasConflict).toBe(false);
    });
  });

  describe("placeholder detection", () => {
    it("detects placeholder values", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"[Company Name]","telephone":"[Phone Number]"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.placeholders.hasPlaceholders).toBe(true);
      expect(result.placeholders.placeholders.length).toBeGreaterThanOrEqual(1);
    });

    it("detects TODO placeholders", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"TODO: Add company name"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.placeholders.hasPlaceholders).toBe(true);
    });

    it("no placeholders with real data", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Corporation","telephone":"+1-555-123-4567"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.placeholders.hasPlaceholders).toBe(false);
    });
  });

  describe("completeness and coverage", () => {
    it("calculates completeness score", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme","url":"https://acme.com","logo":"https://acme.com/logo.png"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.completeness).toBeGreaterThan(0);
      expect(result.coverage).toBeGreaterThan(0);
    });

    it("empty schema has zero scores", () => {
      const html = `<html><head></head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.completeness).toBe(0);
      expect(result.coverage).toBe(0);
    });
  });

  describe("generateSchemaFindings", () => {
    it("generates findings for syntax errors", () => {
      const html = `<html><head>
        <script type="application/ld+json">{invalid}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));
      const findings = generateSchemaFindings(result);

      expect(findings.some((f) => f.title.includes("syntax"))).toBe(true);
    });

    it("generates findings for missing required properties", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Product"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));
      const findings = generateSchemaFindings(result);

      expect(findings.some((f) => f.title.includes("Missing required"))).toBe(true);
    });

    it("generates findings for placeholders", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"[Company Name]"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));
      const findings = generateSchemaFindings(result);

      expect(findings.some((f) => f.title.includes("Placeholder"))).toBe(true);
    });

    it("generates findings for deprecated types", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"ProductOffer","name":"Offer"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));
      const findings = generateSchemaFindings(result);

      expect(findings.some((f) => f.title.includes("Deprecated"))).toBe(true);
    });

    it("generates findings for conflicting data", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Corp"}</script>
        <script type="application/ld+json">{"@type":"Organization","name":"Acme Inc"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));
      const findings = generateSchemaFindings(result);

      expect(findings.some((f) => f.title.includes("Conflicting"))).toBe(true);
    });
  });

  describe("limitations", () => {
    it("includes limitations in result", () => {
      const html = `<html><head>
        <script type="application/ld+json">{"@type":"Organization","name":"Test"}</script>
      </head><body></body></html>`;
      const result = validateStructuredData(createContext(html));

      expect(result.limitations.length).toBeGreaterThan(0);
    });
  });
});
