import * as cheerio from "cheerio";
import type { AuditContext, Finding } from "./types";

export type SchemaLanguage = "json-ld" | "microdata" | "rdfa";

export type SchemaParseResult = {
  language: SchemaLanguage;
  raw: unknown;
  parsed: Record<string, unknown> | null;
  syntaxValid: boolean;
  syntaxErrors: string[];
};

export type SchemaOrgValidation = {
  type: string;
  isValidType: boolean;
  isDeprecated: boolean;
  isRestricted: boolean;
  requiredProperties: string[];
  missingRequired: string[];
  recommendedProperties: string[];
  missingRecommended: string[];
  presentProperties: string[];
  warnings: string[];
};

export type GoogleEligibility = {
  feature: string;
  isEligible: boolean;
  requiredProperties: string[];
  missingRequired: string[];
  supportedProperties: string[];
  missingSupported: string[];
  notes: string[];
};

export type ConflictDetection = {
  hasConflict: boolean;
  conflicts: Array<{
    property: string;
    values: string[];
    severity: "error" | "warning";
    message: string;
  }>;
};

export type PlaceholderDetection = {
  hasPlaceholders: boolean;
  placeholders: Array<{
    property: string;
    value: string;
    pattern: string;
  }>;
};

export type SchemaValidationResult = {
  syntaxValid: boolean;
  syntaxErrors: string[];
  schemaOrg: SchemaOrgValidation[];
  googleEligibility: GoogleEligibility[];
  conflicts: ConflictDetection;
  placeholders: PlaceholderDetection;
  completeness: number;
  coverage: number;
  limitations: string[];
};

const PLACEHOLDER_PATTERNS = [
  /\[.*(?:name|phone|email|address|author|title|description).*\]/i,
  /(?:your|enter|put|type|add)\s+(?:name|phone|email|address|author|title|description)/i,
  /todo|tbd|placeholder|xxx|n\/a/i,
  /\{\{.*\}\}/,
  /(?:john|jane|doe)\s+(?:doe|smith)/i,
];

const DEPRECATED_TYPES = [
  "ProductOffer",
  "Agg",
  "Rating",
  "AggregateRating",
];

const RESTRICTED_TYPES = [
  "SpecialAnnouncement",
  "Dataset",
];

const GOOGLE_FEATURES: Record<string, { required: string[]; recommended: string[]; supported: string[] }> = {
  Article: {
    required: ["headline", "image"],
    recommended: ["datePublished", "dateModified", "author"],
    supported: ["description", "publisher"],
  },
  Organization: {
    required: ["name", "url"],
    recommended: ["logo", "contactPoint", "sameAs"],
    supported: ["description", "address"],
  },
  LocalBusiness: {
    required: ["name", "address", "telephone"],
    recommended: ["openingHours", "geo", "priceRange"],
    supported: ["url", "image", "sameAs"],
  },
  Product: {
    required: ["name", "image"],
    recommended: ["description", "offers"],
    supported: ["brand", "sku", "gtin"],
  },
  Offer: {
    required: ["price", "priceCurrency"],
    recommended: ["availability", "validFrom"],
    supported: ["url", "priceValidUntil"],
  },
  Service: {
    required: ["name", "provider"],
    recommended: ["description", "areaServed"],
    supported: ["url"],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
    supported: [],
  },
  WebSite: {
    required: ["name", "url"],
    recommended: ["potentialAction"],
    supported: ["description"],
  },
  WebPage: {
    required: ["name"],
    recommended: ["description", "datePublished", "dateModified"],
    supported: ["url"],
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
    supported: [],
  },
  HowTo: {
    required: ["name", "step"],
    recommended: ["image", "totalTime"],
    supported: ["description", "supply", "tool"],
  },
  Event: {
    required: ["name", "startDate", "location"],
    recommended: ["endDate", "description"],
    supported: ["url", "image", "offers"],
  },
};

const TYPE_REQUIREMENTS: Record<string, { required: string[]; recommended: string[] }> = {
  Article: {
    required: ["headline"],
    recommended: ["author", "datePublished", "dateModified", "image", "description"],
  },
  Organization: {
    required: ["name"],
    recommended: ["url", "logo", "contactPoint", "sameAs", "description"],
  },
  LocalBusiness: {
    required: ["name", "address"],
    recommended: ["telephone", "url", "openingHours", "geo", "priceRange"],
  },
  Product: {
    required: ["name"],
    recommended: ["image", "description", "offers", "brand", "sku"],
  },
  Offer: {
    required: ["price", "priceCurrency"],
    recommended: ["availability", "url", "validFrom", "priceValidUntil"],
  },
  Service: {
    required: ["name"],
    recommended: ["provider", "description", "areaServed", "url"],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
  },
  WebSite: {
    required: ["name", "url"],
    recommended: ["potentialAction", "description"],
  },
  WebPage: {
    required: ["name"],
    recommended: ["description", "datePublished", "dateModified", "url"],
  },
  Person: {
    required: ["name"],
    recommended: ["url", "image", "jobTitle"],
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
  },
  HowTo: {
    required: ["name"],
    recommended: ["step", "image", "totalTime", "description"],
  },
  Event: {
    required: ["name", "startDate"],
    recommended: ["location", "endDate", "description", "url"],
  },
  Review: {
    required: ["itemReviewed"],
    recommended: ["reviewBody", "author", "reviewRating"],
  },
  AggregateRating: {
    required: ["ratingValue", "reviewCount"],
    recommended: ["bestRating", "worstRating"],
  },
};

function parseJsonLd($: cheerio.CheerioAPI): SchemaParseResult[] {
  const results: SchemaParseResult[] = [];

  $('script[type="application/ld+json"]').each((_i, el) => {
    const raw = $(el).html() || "";
    let parsed: Record<string, unknown> | null = null;
    let syntaxValid = true;
    const syntaxErrors: string[] = [];

    try {
      const data = JSON.parse(raw);
      parsed = typeof data === "object" ? data : null;
    } catch (e) {
      syntaxValid = false;
      syntaxErrors.push(`JSON parse error: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    if (parsed) {
      if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        for (const item of parsed["@graph"]) {
          results.push({
            language: "json-ld",
            raw: item,
            parsed: item as Record<string, unknown>,
            syntaxValid,
            syntaxErrors,
          });
        }
      } else if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "object" && item !== null) {
            results.push({
              language: "json-ld",
              raw: item,
              parsed: item as Record<string, unknown>,
              syntaxValid,
              syntaxErrors,
            });
          }
        }
      } else {
        results.push({
          language: "json-ld",
          raw: parsed,
          parsed,
          syntaxValid,
          syntaxErrors,
        });
      }
    } else if (!syntaxValid) {
      results.push({
        language: "json-ld",
        raw,
        parsed: null,
        syntaxValid: false,
        syntaxErrors,
      });
    }
  });

  return results;
}

function parseMicrodata($: cheerio.CheerioAPI): SchemaParseResult[] {
  const results: SchemaParseResult[] = [];

  $('[itemscope]').each((_i, el) => {
    const $el = $(el);
    const type = $el.attr("itemtype") || "";
    const properties: Record<string, unknown> = {};

    $el.find("[itemprop]").each((_j, propEl) => {
      const $prop = $(propEl);
      const name = $prop.attr("itemprop") || "";
      const content = $prop.attr("content") || $prop.text().trim();
      if (name) {
        properties[name] = content;
      }
    });

    results.push({
      language: "microdata",
      raw: { itemtype: type, properties },
      parsed: { "@type": type.replace("https://schema.org/", "").replace("http://schema.org/", ""), ...properties },
      syntaxValid: true,
      syntaxErrors: [],
    });
  });

  return results;
}

function parseRdfa($: cheerio.CheerioAPI): SchemaParseResult[] {
  const results: SchemaParseResult[] = [];

  $('[typeof]').each((_i, el) => {
    const $el = $(el);
    const type = $el.attr("typeof") || "";
    const properties: Record<string, unknown> = {};

    $el.find("[property]").each((_j, propEl) => {
      const $prop = $(propEl);
      const name = $prop.attr("property") || "";
      const content = $prop.attr("content") || $prop.text().trim();
      if (name) {
        properties[name] = content;
      }
    });

    results.push({
      language: "rdfa",
      raw: { typeof: type, properties },
      parsed: { "@type": type, ...properties },
      syntaxValid: true,
      syntaxErrors: [],
    });
  });

  return results;
}

function validateSchemaOrg(schema: SchemaParseResult): SchemaOrgValidation {
  const type = (schema.parsed?.["@type"] as string) || "";
  const isValidType = !!TYPE_REQUIREMENTS[type];
  const isDeprecated = DEPRECATED_TYPES.includes(type);
  const isRestricted = RESTRICTED_TYPES.includes(type);

  const requirements = TYPE_REQUIREMENTS[type] || { required: [], recommended: [] };
  const properties = schema.parsed ? Object.keys(schema.parsed) : [];

  const missingRequired = requirements.required.filter((p) => !properties.includes(p));
  const missingRecommended = requirements.recommended.filter((p) => !properties.includes(p));

  const warnings: string[] = [];
  if (isDeprecated) warnings.push(`Type "${type}" is deprecated in Schema.org.`);
  if (isRestricted) warnings.push(`Type "${type}" has restricted usage in Schema.org.`);
  if (!isValidType) warnings.push(`Type "${type}" is not a recognized Schema.org type.`);

  return {
    type,
    isValidType,
    isDeprecated,
    isRestricted,
    requiredProperties: requirements.required,
    missingRequired,
    recommendedProperties: requirements.recommended,
    missingRecommended,
    presentProperties: properties,
    warnings,
  };
}

function checkGoogleEligibility(schema: SchemaParseResult): GoogleEligibility[] {
  const type = (schema.parsed?.["@type"] as string) || "";
  const feature = GOOGLE_FEATURES[type];

  if (!feature) {
    return [{
      feature: type,
      isEligible: false,
      requiredProperties: [],
      missingRequired: [],
      supportedProperties: [],
      missingSupported: [],
      notes: [`No Google rich-result support defined for type "${type}".`],
    }];
  }

  const properties = schema.parsed ? Object.keys(schema.parsed) : [];
  const missingRequired = feature.required.filter((p) => !properties.includes(p));
  const missingSupported = feature.supported.filter((p) => !properties.includes(p));

  return [{
    feature: type,
    isEligible: missingRequired.length === 0,
    requiredProperties: feature.required,
    missingRequired,
    supportedProperties: feature.supported,
    missingSupported,
    notes: missingRequired.length > 0
      ? [`Missing required properties for ${type} rich result: ${missingRequired.join(", ")}`]
      : [],
  }];
}

function detectConflicts(schemas: SchemaParseResult[]): ConflictDetection {
  const conflicts: ConflictDetection["conflicts"] = [];

  const identities = new Map<string, string[]>();
  const urls = new Map<string, string[]>();
  const orgs = new Map<string, string[]>();
  const authors = new Map<string, string[]>();

  for (const schema of schemas) {
    if (!schema.parsed) continue;

    const type = schema.parsed["@type"] as string;
    const url = schema.parsed.url as string;
    const name = schema.parsed.name as string;

    if (url) {
      const existing = urls.get(type) || [];
      existing.push(url);
      urls.set(type, existing);
    }

    if (name) {
      const existing = identities.get(type) || [];
      existing.push(name);
      identities.set(type, existing);
    }

    if (type === "Organization" || type === "LocalBusiness") {
      const orgName = schema.parsed.name as string;
      if (orgName) {
        const existing = orgs.get("organization") || [];
        existing.push(orgName);
        orgs.set("organization", existing);
      }
    }

    if (schema.parsed.author) {
      const author = typeof schema.parsed.author === "string"
        ? schema.parsed.author
        : (schema.parsed.author as Record<string, unknown>)?.name as string;
      if (author) {
        const existing = authors.get("author") || [];
        existing.push(author);
        authors.set("author", existing);
      }
    }
  }

  for (const [type, names] of identities) {
    const unique = [...new Set(names)];
    if (unique.length > 1) {
      conflicts.push({
        property: `name (${type})`,
        values: unique,
        severity: "warning",
        message: `Multiple different names found for type "${type}".`,
      });
    }
  }

  for (const orgNames of orgs.values()) {
    const unique = [...new Set(orgNames)];
    if (unique.length > 1) {
      conflicts.push({
        property: "organization",
        values: unique,
        severity: "error",
        message: "Multiple conflicting organization names detected.",
      });
    }
  }

  const uniqueAuthors = [...new Set(authors.get("author") || [])];
  if (uniqueAuthors.length > 1) {
    conflicts.push({
      property: "author",
      values: uniqueAuthors,
      severity: "warning",
      message: "Multiple different authors detected across schemas.",
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

function detectPlaceholders(schemas: SchemaParseResult[]): PlaceholderDetection {
  const placeholders: PlaceholderDetection["placeholders"] = [];

  for (const schema of schemas) {
    if (!schema.parsed) continue;

    for (const [key, value] of Object.entries(schema.parsed)) {
      if (typeof value !== "string") continue;

      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(value)) {
          placeholders.push({
            property: key,
            value,
            pattern: pattern.source,
          });
          break;
        }
      }
    }
  }

  return {
    hasPlaceholders: placeholders.length > 0,
    placeholders,
  };
}

export function validateStructuredData(ctx: AuditContext): SchemaValidationResult {
  const $ = cheerio.load(ctx.main.html);

  const jsonLdSchemas = parseJsonLd($);
  const microdataSchemas = parseMicrodata($);
  const rdfaSchemas = parseRdfa($);

  const allSchemas = [...jsonLdSchemas, ...microdataSchemas, ...rdfaSchemas];

  const syntaxErrors: string[] = [];
  let syntaxValid = true;

  for (const schema of allSchemas) {
    if (!schema.syntaxValid) {
      syntaxValid = false;
      syntaxErrors.push(...schema.syntaxErrors);
    }
  }

  const schemaOrg = allSchemas.map(validateSchemaOrg);
  const googleEligibility = allSchemas.flatMap(checkGoogleEligibility);
  const conflicts = detectConflicts(allSchemas);
  const placeholders = detectPlaceholders(allSchemas);

  const totalProperties = schemaOrg.reduce((sum, s) => sum + s.requiredProperties.length + s.recommendedProperties.length, 0);
  const presentProperties = schemaOrg.reduce((sum, s) => sum + s.presentProperties.length, 0);
  const completeness = totalProperties > 0 ? presentProperties / totalProperties : 0;

  const totalRequired = schemaOrg.reduce((sum, s) => sum + s.requiredProperties.length, 0);
  const presentRequired = totalRequired - schemaOrg.reduce((sum, s) => sum + s.missingRequired.length, 0);
  const coverage = totalRequired > 0 ? presentRequired / totalRequired : 0;

  const limitations = [
    "Schema.org validation is based on common type requirements, not the complete specification.",
    "Google eligibility is based on publicly documented requirements as of the analysis date.",
    "Placeholder detection uses heuristic patterns and may miss custom placeholder formats.",
    "Conflict detection covers common identity properties and may miss domain-specific conflicts.",
  ];

  return {
    syntaxValid,
    syntaxErrors,
    schemaOrg,
    googleEligibility,
    conflicts,
    placeholders,
    completeness,
    coverage,
    limitations,
  };
}

export function generateSchemaFindings(result: SchemaValidationResult): Finding[] {
  const findings: Finding[] = [];

  if (!result.syntaxValid) {
    findings.push({
      code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
      category: "SEO",
      severity: "CRITICAL",
      title: "Schema syntax errors detected",
      recommendation: "Fix JSON-LD syntax errors. Invalid syntax prevents search engines from parsing structured data.",
      evidence: {
        syntaxErrors: result.syntaxErrors,
        proxy: false,
        limitations: [],
      },
    });
  }

  for (const schema of result.schemaOrg) {
    if (schema.missingRequired.length > 0) {
      findings.push({
        code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
        category: "SEO",
        severity: "HIGH",
        title: `Missing required properties for ${schema.type}`,
        recommendation: `Add missing required properties: ${schema.missingRequired.join(", ")}.`,
        evidence: {
          type: schema.type,
          missingRequired: schema.missingRequired,
          proxy: false,
          limitations: [],
        },
      });
    }

    if (schema.isDeprecated) {
      findings.push({
        code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
        category: "SEO",
        severity: "MEDIUM",
        title: `Deprecated schema type: ${schema.type}`,
        recommendation: `Consider replacing deprecated type "${schema.type}" with a supported alternative.`,
        evidence: {
          type: schema.type,
          warnings: schema.warnings,
          proxy: false,
          limitations: [],
        },
      });
    }
  }

  for (const eligibility of result.googleEligibility) {
    if (!eligibility.isEligible && eligibility.missingRequired.length > 0) {
      findings.push({
        code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
        category: "SEO",
        severity: "MEDIUM",
        title: `Not eligible for ${eligibility.feature} rich result`,
        recommendation: `Add missing properties for Google rich result: ${eligibility.missingRequired.join(", ")}.`,
        evidence: {
          feature: eligibility.feature,
          missingRequired: eligibility.missingRequired,
          proxy: false,
          limitations: [],
        },
      });
    }
  }

  if (result.conflicts.hasConflict) {
    for (const conflict of result.conflicts.conflicts) {
      findings.push({
        code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
        category: "SEO",
        severity: conflict.severity === "error" ? "HIGH" : "MEDIUM",
        title: `Conflicting ${conflict.property} values`,
        recommendation: `Resolve conflicting values for ${conflict.property}: ${conflict.values.join(", ")}.`,
        evidence: {
          property: conflict.property,
          values: conflict.values,
          message: conflict.message,
          proxy: false,
          limitations: [],
        },
      });
    }
  }

  if (result.placeholders.hasPlaceholders) {
    findings.push({
      code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
      category: "SEO",
      severity: "CRITICAL",
      title: "Placeholder values detected in schema",
      recommendation: "Remove or replace placeholder values before deploying schema. Placeholder values can harm SEO.",
      evidence: {
        placeholders: result.placeholders.placeholders,
        proxy: false,
        limitations: [],
      },
    });
  }

  return findings;
}
