import type { GuideLocale } from "../guides";
import seoAuditChecklist from "./seo-audit-checklist";
import websiteSpeedTest from "./website-speed-test";
import securityAuditGuide from "./security-audit-guide";
import wordpressSeo from "./wordpress-seo";
import ecommerceAudit from "./ecommerce-audit";

export type BlogLocale = "fa" | "en";

type BlogTranslation = {
  title: string;
  description: string;
  sections: string[];
  content: string;
  cta: string;
};

export type BlogPost = {
  slug: string;
  updatedAt: string;
  relatedSlugs: string[];
  fa: BlogTranslation;
  en: BlogTranslation;
};

export type BlogPostLocalized = {
  slug: string;
  updatedAt: string;
  relatedSlugs: string[];
  title: string;
  description: string;
  sections: string[];
  content: string;
  cta: string;
};

const blogPosts: BlogPost[] = [
  seoAuditChecklist,
  websiteSpeedTest,
  securityAuditGuide,
  wordpressSeo,
  ecommerceAudit
];

function toBlogPostLocalized(post: BlogPost, locale: BlogLocale): BlogPostLocalized {
  const localized = post[locale];
  return {
    slug: post.slug,
    updatedAt: post.updatedAt,
    relatedSlugs: post.relatedSlugs,
    title: localized.title,
    description: localized.description,
    sections: localized.sections,
    content: localized.content,
    cta: localized.cta
  };
}

export function getBlogPosts(locale: BlogLocale): BlogPostLocalized[] {
  return blogPosts.map((post) => toBlogPostLocalized(post, locale));
}

export function getBlogPostBySlug(slug: string, locale: BlogLocale): BlogPostLocalized | undefined {
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return undefined;
  return toBlogPostLocalized(post, locale);
}

export function getBlogSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

export function getBlogUpdatedAtMap(): Map<string, string> {
  return new Map(blogPosts.map((post) => [post.slug, post.updatedAt]));
}

export function getRelatedBlogPosts(slug: string, locale: BlogLocale, limit = 3): BlogPostLocalized[] {
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return [];

  return post.relatedSlugs
    .map((relatedSlug) => blogPosts.find((p) => p.slug === relatedSlug))
    .filter((item): item is BlogPost => Boolean(item))
    .slice(0, limit)
    .map((item) => toBlogPostLocalized(item, locale));
}

export function toGuideLocale(locale: BlogLocale): GuideLocale {
  return locale;
}
