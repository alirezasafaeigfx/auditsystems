import * as cheerio from "cheerio";
import type { AuditContext, Finding } from "./types";

export type DetectedLanguage = "fa" | "ar" | "en" | "mixed" | "unknown";
export type WritingDirection = "rtl" | "ltr";
export type PageType = "homepage" | "service" | "product" | "article" | "location" | "utility" | "unknown";

export type ContentLanguageResult = {
  language: DetectedLanguage;
  direction: WritingDirection;
  confidence: number;
  evidence: string[];
  limitations: string[];
};

export type ContentExtraction = {
  wordCount: number;
  sentenceCount: number;
  headingCount: number;
  listCount: number;
  tableCount: number;
  linkCount: number;
  imageCount: number;
  paragraphs: number;
};

export type AuthorSignals = {
  hasAuthorName: boolean;
  hasAuthorBio: boolean;
  hasAuthorImage: boolean;
  hasAuthorSchema: boolean;
  authorNames: string[];
  evidence: string[];
  limitations: string[];
};

export type OrganizationSignals = {
  hasOrganizationName: boolean;
  hasOrganizationSchema: boolean;
  hasContactInfo: boolean;
  hasAddress: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasSocialLinks: boolean;
  evidence: string[];
  limitations: string[];
};

export type TrustSignals = {
  hasPrivacyPolicy: boolean;
  hasTermsOfService: boolean;
  hasAboutPage: boolean;
  hasContactPage: boolean;
  hasPhysicalAddress: boolean;
  hasTestimonials: boolean;
  hasCaseStudies: boolean;
  hasCertifications: boolean;
  evidence: string[];
  limitations: string[];
};

export type CitationSignals = {
  hasExternalCitations: boolean;
  hasStatistics: boolean;
  hasQuotes: boolean;
  hasReferences: boolean;
  citationCount: number;
  evidence: string[];
  limitations: string[];
};

export type EeatProxyAssessment = {
  experience: { score: "present" | "partial" | "absent"; evidence: string[]; limitations: string[] };
  expertise: { score: "present" | "partial" | "absent"; evidence: string[]; limitations: string[] };
  authoritativeness: { score: "present" | "partial" | "absent"; evidence: string[]; limitations: string[] };
  trust: { score: "present" | "partial" | "absent"; evidence: string[]; limitations: string[] };
  geoReadiness: { score: "present" | "partial" | "absent"; evidence: string[]; limitations: string[] };
};

export type ContentAnalysisResult = {
  language: ContentLanguageResult;
  pageType: PageType;
  content: ContentExtraction;
  author: AuthorSignals;
  organization: OrganizationSignals;
  trust: TrustSignals;
  citations: CitationSignals;
  eeat: EeatProxyAssessment;
  coverage: number;
  confidence: number;
  limitations: string[];
};

const PERSIAN_RANGES = [
  /[\u0600-\u06FF]/g,
  /[\u0750-\u077F]/g,
  /[\uFB50-\uFDFF]/g,
  /[\uFE70-\uFEFF]/g,
];

const PERSIAN_SPECIFIC = [
  /[\u067E]/g,
  /[\u0686]/g,
  /[\u0698]/g,
  /[\u06A9]/g,
  /[\u06AF]/g,
  /[\u06CC]/g,
];

const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;

const PERSIAN_PUNCTUATION = /[؟،؛]/g;

function countPatternMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function normalizePersianText(text: string): string {
  return text
    .replace(ZERO_WIDTH_CHARS, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ؤ/g, "و")
    .replace(/إ/g, "ا")
    .replace(/أ/g, "ا")
    .replace(/ة/g, "ه");
}

function detectLanguageFromHtml(html: string): ContentLanguageResult {
  const $ = cheerio.load(html);
  const evidence: string[] = [];
  const limitations: string[] = [];

  const htmlLang = $("html").attr("lang") || "";
  const dir = $("html").attr("dir") || "";

  if (htmlLang) {
    evidence.push(`HTML lang attribute: "${htmlLang}"`);
  }
  if (dir) {
    evidence.push(`HTML dir attribute: "${dir}"`);
  }

  const textContent = $.text();
  const normalizedText = normalizePersianText(textContent);

  let persianCount = 0;
  for (const range of PERSIAN_RANGES) {
    persianCount += countPatternMatches(normalizedText, range);
  }

  let persianSpecificCount = 0;
  for (const specific of PERSIAN_SPECIFIC) {
    persianSpecificCount += countPatternMatches(normalizedText, specific);
  }

  const persianPunctuation = countPatternMatches(normalizedText, PERSIAN_PUNCTUATION);

  const englishCount = countPatternMatches(normalizedText, /[a-zA-Z]/g);
  const totalAlpha = persianCount + englishCount;

  let language: DetectedLanguage = "unknown";
  let confidence = 0;

  if (persianSpecificCount > 10 || persianPunctuation > 3) {
    language = "fa";
    confidence = Math.min(0.95, 0.6 + (persianSpecificCount / Math.max(totalAlpha, 1)) * 0.35);
    evidence.push(`Persian-specific characters: ${persianSpecificCount}`);
    evidence.push(`Persian punctuation: ${persianPunctuation}`);
  } else if (persianCount > 0 && englishCount > 0) {
    const ratio = persianCount / (persianCount + englishCount);
    if (ratio > 0.3 && ratio < 0.7) {
      language = "mixed";
      confidence = 0.5;
    } else if (ratio >= 0.7) {
      language = "fa";
      confidence = 0.75;
    } else {
      language = "en";
      confidence = 0.75;
    }
    evidence.push(`Persian chars: ${persianCount}, English chars: ${englishCount}, ratio: ${ratio.toFixed(2)}`);
  } else if (persianCount > 0) {
    language = "fa";
    confidence = 0.85;
  } else if (englishCount > 0) {
    language = "en";
    confidence = 0.85;
  }

  if (htmlLang) {
    if (htmlLang.startsWith("fa") || htmlLang.startsWith("fa-IR")) {
      if (language === "en") {
        limitations.push("HTML lang says Persian but content appears English.");
      }
      language = "fa";
      confidence = Math.max(confidence, 0.8);
    } else if (htmlLang.startsWith("en")) {
      if (language === "fa") {
        limitations.push("HTML lang says English but content appears Persian.");
      }
      language = "en";
      confidence = Math.max(confidence, 0.8);
    }
  }

  const direction: WritingDirection = dir === "rtl" || (language === "fa" && dir !== "ltr") ? "rtl" : "ltr";

  if (direction === "rtl") {
    evidence.push("Writing direction: RTL");
  } else {
    evidence.push("Writing direction: LTR");
  }

  limitations.push("Language detection is heuristic-based and may be inaccurate for mixed or short content.");

  return { language, direction, confidence, evidence, limitations };
}

function extractContent($: cheerio.CheerioAPI): ContentExtraction {
  const text = $.text();
  const normalizedText = normalizePersianText(text);

  const words = normalizedText
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const sentences = normalizedText
    .split(/[.!?؟!]\s+/)
    .filter((s) => s.trim().length > 0);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    headingCount: $("h1, h2, h3, h4, h5, h6").length,
    listCount: $("ul, ol").length,
    tableCount: $("table").length,
    linkCount: $("a[href]").length,
    imageCount: $("img").length,
    paragraphs: $("p").length,
  };
}

function extractAuthorSignals($: cheerio.CheerioAPI): AuthorSignals {
  const evidence: string[] = [];
  const limitations: string[] = [];

  const authorMeta = $('meta[name="author"]').attr("content") || "";
  const authorLink = $('a[href*="/author/"], a[href*="/about/"]').text().trim();
  const authorSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      return typeof data?.author === "object" || typeof data?.author === "string";
    } catch {
      return false;
    }
  });

  const authorNameElements = $('[class*="author"], [rel="author"], [itemprop="author"]').text().trim();

  const hasAuthorName = !!(authorMeta || authorLink || authorNameElements);
  const hasAuthorBio = !!($('[class*="author-bio"], [class*="author-description"], [class*="about-author"]').length);
  const hasAuthorImage = !!($('[class*="author-avatar"], [class*="author-photo"], [itemprop="image"][class*="author"]').length);
  const hasAuthorSchema = authorSchema;

  const authorNames: string[] = [];
  if (authorMeta) authorNames.push(authorMeta);
  if (authorLink) authorNames.push(authorLink);

  if (hasAuthorName) evidence.push("Author name detected");
  if (hasAuthorBio) evidence.push("Author bio detected");
  if (hasAuthorImage) evidence.push("Author image detected");
  if (hasAuthorSchema) evidence.push("Author schema.org detected");

  limitations.push("Author signal detection is heuristic and may miss custom implementations.");

  return { hasAuthorName, hasAuthorBio, hasAuthorImage, hasAuthorSchema, authorNames, evidence, limitations };
}

function extractOrganizationSignals($: cheerio.CheerioAPI): OrganizationSignals {
  const evidence: string[] = [];
  const limitations: string[] = [];

  const orgSchema = $('script[type="application/ld+json"]').toArray().some((el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      return data?.["@type"] === "Organization" || data?.organization;
    } catch {
      return false;
    }
  });

  const orgName = $('[class*="company"], [class*="brand"], [itemprop="name"]').first().text().trim();
  const hasContactInfo = !!($('[href^="tel:"], [href^="mailto:"], [class*="contact"], [class*="phone"], [class*="email"]').length);
  const hasAddress = !!($('[itemprop="address"], [class*="address"], address').length);
  const hasPhone = !!($('[href^="tel:"], [class*="phone"], [class*="tel"]').length);
  const hasEmail = !!($('[href^="mailto:"], [class*="email"]').length);
  const hasSocialLinks = !!($('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="t.me"]').length);

  if (orgName) evidence.push("Organization name detected");
  if (orgSchema) evidence.push("Organization schema.org detected");
  if (hasContactInfo) evidence.push("Contact information detected");
  if (hasAddress) evidence.push("Physical address detected");
  if (hasPhone) evidence.push("Phone number detected");
  if (hasEmail) evidence.push("Email address detected");
  if (hasSocialLinks) evidence.push("Social media links detected");

  limitations.push("Organization signal detection is heuristic and may miss custom implementations.");

  return {
    hasOrganizationName: !!orgName,
    hasOrganizationSchema: orgSchema,
    hasContactInfo,
    hasAddress,
    hasPhone,
    hasEmail,
    hasSocialLinks,
    evidence,
    limitations,
  };
}

function extractTrustSignals($: cheerio.CheerioAPI): TrustSignals {
  const evidence: string[] = [];
  const limitations: string[] = [];

  const links = $("a[href]").toArray().map((el) => ({
    href: $(el).attr("href") || "",
    text: $(el).text().toLowerCase(),
  }));

  const hasPrivacyPolicy = links.some(
    (l) => l.href.includes("privacy") || l.text.includes("privacy") || l.text.includes("حریم خصوصی") || l.text.includes("سیاست حریم")
  );
  const hasTermsOfService = links.some(
    (l) => l.href.includes("terms") || l.text.includes("terms") || l.text.includes("شرایط") || l.text.includes("قوانین")
  );
  const hasAboutPage = links.some(
    (l) => l.href.includes("about") || l.text.includes("about") || l.text.includes("درباره") || l.text.includes("معرفی")
  );
  const hasContactPage = links.some(
    (l) => l.href.includes("contact") || l.text.includes("contact") || l.text.includes("تماس") || l.text.includes("ارتباط")
  );

  const hasPhysicalAddress = !!($('[itemprop="address"], [class*="address"], address, [class*="location"]').length);
  const hasTestimonials = !!($('[class*="testimonial"], [class*="review"], [class*="feedback"], [class*="نظر"]').length);
  const hasCaseStudies = !!($('[class*="case-study"], [class*="portfolio"], [class*="نمونه"]').length);
  const hasCertifications = !!($('[class*="certification"], [class*="badge"], [class*="certificate"], [class*="گواهینامه"]').length);

  if (hasPrivacyPolicy) evidence.push("Privacy policy detected");
  if (hasTermsOfService) evidence.push("Terms of service detected");
  if (hasAboutPage) evidence.push("About page detected");
  if (hasContactPage) evidence.push("Contact page detected");
  if (hasPhysicalAddress) evidence.push("Physical address detected");
  if (hasTestimonials) evidence.push("Testimonials detected");
  if (hasCaseStudies) evidence.push("Case studies detected");
  if (hasCertifications) evidence.push("Certifications detected");

  limitations.push("Trust signal detection is heuristic and may miss custom implementations.");

  return {
    hasPrivacyPolicy,
    hasTermsOfService,
    hasAboutPage,
    hasContactPage,
    hasPhysicalAddress,
    hasTestimonials,
    hasCaseStudies,
    hasCertifications,
    evidence,
    limitations,
  };
}

function extractCitationSignals($: cheerio.CheerioAPI): CitationSignals {
  const evidence: string[] = [];
  const limitations: string[] = [];

  const externalLinks = $("a[href]").filter((_i, el) => {
    const href = $(el).attr("href") || "";
    return href.startsWith("http") && !href.includes(new URL("https://example.com").hostname);
  });

  const citationCount = externalLinks.length;

  const statisticPatterns = [
    /[\d۰-۹]+\s*٪/,
    /٪\s*[\d۰-۹]+/,
    /[\d۰-۹]+\s*%/,
    /%\s*[\d۰-۹]+/,
    /[\d۰-۹]+\s*درصد/,
    /[\d۰-۹]+\s*percent/,
    /[\d۰-۹]+\s*billion/,
    /[\d۰-۹]+\s*million/,
    /[\d۰-۹]+\s*هزار/,
    /[\d۰-۹]+\s*میلیون/,
    /[\d۰-۹]+\s*میلیارد/,
  ];

  const text = $.text();
  const hasStatistics = statisticPatterns.some((p) => p.test(text));

  const quotePatterns = [
    /["""]\s*[^"""]{20,}\s*["""]/,
    /[«»]\s*[^«»]{20,}\s*[«»]/,
  ];
  const hasQuotes = quotePatterns.some((p) => p.test(text));

  const hasReferences = !!($('[class*="reference"], [class*="citation"], [class*="source"], [id="references"], [id="sources"]').length);

  const hasExternalCitations = citationCount > 2;

  if (hasExternalCitations) evidence.push(`External citations: ${citationCount}`);
  if (hasStatistics) evidence.push("Statistics detected");
  if (hasQuotes) evidence.push("Quotes detected");
  if (hasReferences) evidence.push("References section detected");

  limitations.push("Citation detection is heuristic and may not capture all citation formats.");

  return { hasExternalCitations, hasStatistics, hasQuotes, hasReferences, citationCount, evidence, limitations };
}

function classifyPageType($: cheerio.CheerioAPI, url: string): PageType {
  const path = new URL(url).pathname.toLowerCase();

  if (path === "/" || path === "") return "homepage";
  if (/\/(service|services|خدمات)/.test(path)) return "service";
  if (/\/(product|products|محصول|کالا)/.test(path)) return "product";
  if (/\/(article|blog|news|post|مقاله|بلاگ)/.test(path)) return "article";
  if (/\/(location|locations|branch|شعبه|آدرس)/.test(path)) return "location";
  if (/\/(about|contact|faq|terms|privacy|درباره|تماس|سوال|شرایط|حریم)/.test(path)) return "utility";

  const h1 = $("h1").text().toLowerCase();
  if (h1.includes("home") || h1.includes("خانه") || h1.includes("صفحه اصلی")) return "homepage";

  return "unknown";
}

function assessEeat(
  author: AuthorSignals,
  org: OrganizationSignals,
  trustSignals: TrustSignals,
  citations: CitationSignals,
  content: ContentExtraction,
): EeatProxyAssessment {
  const experience = {
    score: "absent" as "present" | "partial" | "absent",
    evidence: [] as string[],
    limitations: ["Experience assessment is based on visible signals only."] as string[],
  };
  const expertise = {
    score: "absent" as "present" | "partial" | "absent",
    evidence: [] as string[],
    limitations: ["Expertise assessment is a proxy, not a factual claim."] as string[],
  };
  const authoritativeness = {
    score: "absent" as "present" | "partial" | "absent",
    evidence: [] as string[],
    limitations: ["Authoritativeness is a proxy assessment based on structural signals."] as string[],
  };
  const trustScore = {
    score: "absent" as "present" | "partial" | "absent",
    evidence: [] as string[],
    limitations: ["Trust assessment is based on visible signals and should be verified manually."] as string[],
  };
  const geoReadiness = {
    score: "absent" as "present" | "partial" | "absent",
    evidence: [] as string[],
    limitations: ["GEO readiness is a proxy and does not guarantee AI search visibility."] as string[],
  };

  // Experience
  if (author.hasAuthorName && author.hasAuthorBio) {
    experience.score = "present";
    experience.evidence.push("Author name and bio detected");
  } else if (author.hasAuthorName) {
    experience.score = "partial";
    experience.evidence.push("Author name detected but no bio");
  }

  // Expertise
  if (content.wordCount > 500 && content.headingCount > 3) {
    expertise.score = "present";
    expertise.evidence.push(`Substantial content (${content.wordCount} words, ${content.headingCount} headings)`);
  } else if (content.wordCount > 200) {
    expertise.score = "partial";
    expertise.evidence.push(`Moderate content (${content.wordCount} words)`);
  }

  // Authoritativeness
  if (citations.hasExternalCitations && citations.citationCount > 5) {
    authoritativeness.score = "present";
    authoritativeness.evidence.push(`Strong citation presence (${citations.citationCount} external links)`);
  } else if (org.hasOrganizationSchema || citations.citationCount > 2) {
    authoritativeness.score = "partial";
    authoritativeness.evidence.push("Some organizational or citation signals present");
  }

  // Trust
  if (trustSignals.hasPrivacyPolicy && trustSignals.hasTermsOfService && trustSignals.hasContactPage) {
    trustScore.score = "present";
    trustScore.evidence.push("Privacy policy, terms, and contact page detected");
  } else if (trustSignals.hasPrivacyPolicy || trustSignals.hasContactPage) {
    trustScore.score = "partial";
    trustScore.evidence.push("Some trust signals detected");
  }

  // GEO readiness
  if (content.wordCount > 300 && citations.hasStatistics && org.hasOrganizationSchema) {
    geoReadiness.score = "present";
    geoReadiness.evidence.push("Structured content with statistics and schema");
  } else if (content.wordCount > 200 || citations.hasExternalCitations) {
    geoReadiness.score = "partial";
    geoReadiness.evidence.push("Some GEO-relevant signals present");
  }

  return { experience, expertise, authoritativeness, trust: trustScore, geoReadiness };
}

export function analyzeContent(ctx: AuditContext): ContentAnalysisResult {
  const $ = cheerio.load(ctx.main.html);

  const language = detectLanguageFromHtml(ctx.main.html);
  const pageType = classifyPageType($, ctx.target.normalizedUrl);
  const content = extractContent($);
  const author = extractAuthorSignals($);
  const org = extractOrganizationSignals($);
  const trustSignals = extractTrustSignals($);
  const citations = extractCitationSignals($);
  const eeat = assessEeat(author, org, trustSignals, citations, content);

  const signalCount = [
    author.hasAuthorName ? 1 : 0,
    author.hasAuthorBio ? 1 : 0,
    org.hasOrganizationSchema ? 1 : 0,
    org.hasContactInfo ? 1 : 0,
    trustSignals.hasPrivacyPolicy ? 1 : 0,
    trustSignals.hasTermsOfService ? 1 : 0,
    trustSignals.hasContactPage ? 1 : 0,
    citations.hasExternalCitations ? 1 : 0,
    citations.hasStatistics ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const coverage = signalCount / 9;
  const confidence = Math.min(0.9, language.confidence * 0.4 + coverage * 0.6);

  const limitations = [
    ...language.limitations,
    "Content analysis is heuristic-based and should not be used as the sole basis for ranking decisions.",
    "E-E-A-T assessments are proxies, not Google scores.",
    "GEO readiness does not guarantee AI search visibility.",
  ];

  return {
    language,
    pageType,
    content,
    author,
    organization: org,
    trust: trustSignals,
    citations,
    eeat,
    coverage,
    confidence,
    limitations,
  };
}

export function generateContentFindings(analysis: ContentAnalysisResult): Finding[] {
  const findings: Finding[] = [];

  if (analysis.content.wordCount < 300) {
    findings.push({
      code: "SEO_BASICS_MISSING",
      category: "SEO",
      severity: "MEDIUM",
      title: "Content may be thin",
      recommendation: "Add more substantive content. Contextual guidance: thin content is not determined by word count alone.",
      evidence: {
        wordCount: analysis.content.wordCount,
        proxy: true,
        limitations: ["Word count alone does not determine content quality."],
      },
    });
  }

  if (analysis.author.hasAuthorName && !analysis.author.hasAuthorBio) {
    findings.push({
      code: "SEO_BASICS_MISSING",
      category: "SEO",
      severity: "LOW",
      title: "Author bio missing",
      recommendation: "Add an author bio to strengthen E-E-A-T signals.",
      evidence: {
        hasAuthorName: true,
        hasAuthorBio: false,
        proxy: true,
        limitations: ["Author bio presence is a signal, not a guarantee."],
      },
    });
  }

  if (!analysis.organization.hasOrganizationSchema) {
    findings.push({
      code: "SCHEMA_ORG_NO_RECOMMENDED_TYPES",
      category: "SEO",
      severity: "LOW",
      title: "Organization schema missing",
      recommendation: "Add Organization schema.org markup to strengthen authoritativeness signals.",
      evidence: {
        hasOrganizationSchema: false,
        proxy: true,
        limitations: ["Organization schema is a signal, not a guarantee."],
      },
    });
  }

  if (!analysis.trust.hasPrivacyPolicy) {
    findings.push({
      code: "SEO_BASICS_MISSING",
      category: "SEO",
      severity: "LOW",
      title: "Privacy policy not detected",
      recommendation: "Add a privacy policy page and link to it from the site footer.",
      evidence: {
        hasPrivacyPolicy: false,
        proxy: true,
        limitations: ["Privacy policy presence is a trust signal."],
      },
    });
  }

  return findings;
}
