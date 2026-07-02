export type GuideLocale = "fa" | "en";

type GuideTranslation = {
  title: string;
  summary: string;
  sections: string[];
};

type GuideSeed = {
  slug: string;
  updatedAt: string;
  relatedSlugs: string[];
  fa: GuideTranslation;
  en: GuideTranslation;
};

export type Guide = {
  slug: string;
  updatedAt: string;
  relatedSlugs: string[];
  title: string;
  summary: string;
  sections: string[];
};

const guideSeeds: GuideSeed[] = [
  {
    slug: "iran-website-performance-checklist",
    updatedAt: "2026-02-20",
    relatedSlugs: ["fix-core-web-vitals-fast", "third-party-script-risk-audit", "production-observability-baseline"],
    fa: {
      title: "چک‌لیست کارایی وب‌سایت در ایران",
      summary: "یک چک‌لیست عملی برای کاهش تاخیر و بهبود سرعت ادراکی کاربر.",
      sections: ["مسیر رندر بحرانی", "فشرده‌سازی و کش", "بودجه اسکریپت ثالث", "پایش"]
    },
    en: {
      title: "Iran Website Performance Checklist",
      summary: "A practical checklist to reduce latency and improve perceived speed.",
      sections: ["Critical rendering path", "Compression and caching", "Third-party budget", "Monitoring"]
    }
  },
  {
    slug: "fix-core-web-vitals-fast",
    updatedAt: "2026-02-19",
    relatedSlugs: ["iran-website-performance-checklist", "production-observability-baseline", "technical-seo-audit-template"],
    fa: {
      title: "بهبود سریع Core Web Vitals",
      summary: "روش تشخیص و بهبود LCP، CLS و INP در محیط واقعی.",
      sections: ["گلوگاه‌های LCP", "ریشه‌های CLS", "پروفایل INP", "گیت جلوگیری از رگرسیون"]
    },
    en: {
      title: "Fix Core Web Vitals Fast",
      summary: "How to diagnose and improve LCP, CLS, and INP in production.",
      sections: ["LCP bottlenecks", "CLS root causes", "INP interaction profiling", "Regression gates"]
    }
  },
  {
    slug: "technical-seo-audit-template",
    updatedAt: "2026-02-18",
    relatedSlugs: ["programmatic-seo-content-system", "fix-core-web-vitals-fast", "security-headers-for-growth-sites"],
    fa: {
      title: "قالب ممیزی Technical SEO",
      summary: "الگوی ساختاریافته برای ایندکس‌پذیری، crawlability و کیفیت متادیتا.",
      sections: ["ایندکس‌پذیری", "استراتژی canonical", "داده ساختاریافته", "کیفیت sitemap"]
    },
    en: {
      title: "Technical SEO Audit Template",
      summary: "Structured template for indexing, crawlability, and metadata quality.",
      sections: ["Indexability", "Canonical strategy", "Structured data", "Sitemap quality"]
    }
  },
  {
    slug: "security-headers-for-growth-sites",
    updatedAt: "2026-02-17",
    relatedSlugs: ["ssrf-safe-url-processing", "technical-seo-audit-template", "third-party-script-risk-audit"],
    fa: {
      title: "هدرهای امنیتی برای سایت‌های رشد",
      summary: "هدرهای امنیتی پیشنهادی بدون تخریب جریان‌های مارکتینگ و سئو.",
      sections: ["استراتژی CSP", "رول‌اوت HSTS", "محافظت‌های frame/content", "تایید نهایی"]
    },
    en: {
      title: "Security Headers for Growth Sites",
      summary: "Recommended HTTP security headers without hurting marketing workflows.",
      sections: ["CSP strategy", "HSTS rollout", "Frame and content protections", "Verification"]
    }
  },
  {
    slug: "ssrf-safe-url-processing",
    updatedAt: "2026-02-16",
    relatedSlugs: ["security-headers-for-growth-sites", "audit-worker-reliability-patterns", "technical-seo-audit-template"],
    fa: {
      title: "پردازش URL امن در برابر SSRF",
      summary: "نرمال‌سازی دفاعی URL و کنترل DNS rebinding برای fetch امن.",
      sections: ["محدودیت پروتکل", "مسدودسازی شبکه خصوصی", "اعتبارسنجی DNS", "کنترل عملیاتی"]
    },
    en: {
      title: "SSRF-Safe URL Processing",
      summary: "Defensive URL normalization and DNS rebinding protections.",
      sections: ["Protocol restrictions", "Private network blocking", "DNS validation", "Operational safeguards"]
    }
  },
  {
    slug: "third-party-script-risk-audit",
    updatedAt: "2026-02-15",
    relatedSlugs: ["iran-website-performance-checklist", "security-headers-for-growth-sites", "production-observability-baseline"],
    fa: {
      title: "ممیزی ریسک اسکریپت‌های Third-Party",
      summary: "ممیزی و کنترل تامین‌کنندگان اسکریپت که روی حریم خصوصی و کارایی اثر می‌گذارند.",
      sections: ["استخراج inventory", "امتیازدهی ریسک", "استراتژی defer", "سیاست vendor"]
    },
    en: {
      title: "Third-Party Script Risk Audit",
      summary: "Audit and control script suppliers affecting privacy and performance.",
      sections: ["Inventory extraction", "Risk scoring", "Deferral strategy", "Vendor policy"]
    }
  },
  {
    slug: "production-observability-baseline",
    updatedAt: "2026-02-14",
    relatedSlugs: ["audit-worker-reliability-patterns", "fix-core-web-vitals-fast", "unlock-funnel-conversion-ops"],
    fa: {
      title: "Baseline مشاهده‌پذیری در Production",
      summary: "راه‌اندازی لاگ، متریک و alert عملیاتی برای قیف‌های وب.",
      sections: ["ردیابی درخواست", "SLI/SLO", "استراتژی هشدار", "شواهد incident"]
    },
    en: {
      title: "Production Observability Baseline",
      summary: "Set up actionable logs, metrics, and alerts for web funnels.",
      sections: ["Request tracing", "SLIs and SLOs", "Alerting strategy", "Incident evidence"]
    }
  },
  {
    slug: "unlock-funnel-conversion-ops",
    updatedAt: "2026-02-13",
    relatedSlugs: ["production-observability-baseline", "technical-seo-audit-template", "audit-worker-reliability-patterns"],
    fa: {
      title: "عملیات تبدیل در قیف Unlock",
      summary: "طراحی جریان لید تا سفارش با رویدادهای بک‌اند قابل اتکا.",
      sections: ["یکپارچگی lead capture", "چرخه عمر سفارش", "مدیریت callback", "آنالیتیکس درآمد"]
    },
    en: {
      title: "Unlock Funnel Conversion Ops",
      summary: "Design lead-to-order conversion flow with robust backend events.",
      sections: ["Lead capture integrity", "Order lifecycle", "Callback handling", "Revenue analytics"]
    }
  },
  {
    slug: "audit-worker-reliability-patterns",
    updatedAt: "2026-02-12",
    relatedSlugs: ["production-observability-baseline", "ssrf-safe-url-processing", "unlock-funnel-conversion-ops"],
    fa: {
      title: "الگوهای پایداری Worker در Audit",
      summary: "الگوهای lease، retry و timeout برای jobهای پس‌زمینه قابل اعتماد.",
      sections: ["معنای lease", "تنظیم backoff", "poison jobs", "الگوی runbook"]
    },
    en: {
      title: "Audit Worker Reliability Patterns",
      summary: "Queue leases, retry strategy, and timeout controls for background jobs.",
      sections: ["Lease semantics", "Backoff tuning", "Poison jobs", "Runbook practices"]
    }
  },
  {
    slug: "programmatic-seo-content-system",
    updatedAt: "2026-02-11",
    relatedSlugs: ["technical-seo-audit-template", "unlock-funnel-conversion-ops", "iran-website-performance-checklist"],
    fa: {
      title: "سیستم محتوای Programmatic SEO",
      summary: "ساخت hub محتوایی مقیاس‌پذیر با governance کیفی و انضباط schema.",
      sections: ["خوشه‌بندی موضوعی", "قیود template", "لینک‌سازی داخلی", "بازبینی کیفیت"]
    },
    en: {
      title: "Programmatic SEO Content System",
      summary: "Build scalable guide hubs with quality governance and schema discipline.",
      sections: ["Topic clustering", "Template constraints", "Internal linking", "Quality review"]
    }
  },
  {
    slug: "website-security-checklist-iran",
    updatedAt: "2026-07-02",
    relatedSlugs: ["security-headers-for-growth-sites", "ssrf-safe-url-processing", "third-party-script-risk-audit"],
    fa: {
      title: "چک‌لیست امنیت وب‌سایت برای کسب‌وکارهای ایرانی",
      summary: "چک‌لیست جامع امنیت وب‌سایت شامل هدرها، HTTPS، XSS و محافظت از داده‌ها.",
      sections: ["هدرهای امنیتی", "گواهی SSL و HTTPS", "محافظت XSS و CSRF", "حریم خصوصی داده‌ها"]
    },
    en: {
      title: "Website Security Checklist for Iranian Businesses",
      summary: "Comprehensive website security checklist covering headers, HTTPS, XSS, and data protection.",
      sections: ["Security headers", "SSL and HTTPS", "XSS and CSRF protection", "Data privacy"]
    }
  },
  {
    slug: "wordpress-speed-optimization",
    updatedAt: "2026-07-02",
    relatedSlugs: ["fix-core-web-vitals-fast", "iran-website-performance-checklist", "third-party-script-risk-audit"],
    fa: {
      title: "بهینه‌سازی سرعت برای سایت‌های وردپرسی",
      summary: "راهنمای عملی بهینه‌سازی سرعت وردپرس از انتخاب هاست تا بهینه‌سازی اسکریپت‌ها.",
      sections: ["انتخاب هاست مناسب", "بهینه‌سازی تصاویر و دیتابیس", "کش و CDN", "کاهش اسکریپت‌های اضافی"]
    },
    en: {
      title: "WordPress Speed Optimization Guide",
      summary: "Practical guide to optimize WordPress speed from hosting selection to script optimization.",
      sections: ["Choosing the right hosting", "Image and database optimization", "Caching and CDN", "Reducing bloat scripts"]
    }
  },
  {
    slug: "ecommerce-seo-technical-guide",
    updatedAt: "2026-07-02",
    relatedSlugs: ["technical-seo-audit-template", "programmatic-seo-content-system", "fix-core-web-vitals-fast"],
    fa: {
      title: "سئوی فنی برای فروشگاه‌های آنلاین",
      summary: "راهنمای جامع سئوی فنی فروشگاهی شامل صفحات محصول، فیلترها و داده ساختاریافته.",
      sections: ["سئوی صفحات محصول", "مدیریت فیلترها و صفحه‌بندی", "داده ساختاریافته Product", "سایت‌مپ محصولات"]
    },
    en: {
      title: "Technical SEO for E-commerce Sites",
      summary: "Comprehensive e-commerce technical SEO covering product pages, filters, and structured data.",
      sections: ["Product page SEO", "Filter and pagination management", "Product structured data", "Product sitemaps"]
    }
  },
  {
    slug: "mobile-app-performance-audit",
    updatedAt: "2026-07-02",
    relatedSlugs: ["fix-core-web-vitals-fast", "production-observability-baseline", "iran-website-performance-checklist"],
    fa: {
      title: "ارزیابی عملکرد اپلیکیشن‌های موبایل",
      summary: "چک‌لیست ارزیابی عملکرد PWA و اپلیکیشن‌های موبایل وب‌محور.",
      sections: ["بارگذاری اولیه", "تعامل و پاسخ‌دهی", "صرفه‌جویی در باتری", "آفلاین و کشینگ"]
    },
    en: {
      title: "Mobile App Performance Audit",
      summary: "Checklist for auditing PWA and mobile web application performance.",
      sections: ["Initial load", "Interaction and responsiveness", "Battery efficiency", "Offline and caching"]
    }
  }
];

function toGuide(seed: GuideSeed, locale: GuideLocale): Guide {
  const localized = seed[locale];
  return {
    slug: seed.slug,
    updatedAt: seed.updatedAt,
    relatedSlugs: seed.relatedSlugs,
    title: localized.title,
    summary: localized.summary,
    sections: localized.sections
  };
}

export function getGuides(locale: GuideLocale): Guide[] {
  return guideSeeds.map((seed) => toGuide(seed, locale));
}

export function getGuideBySlug(slug: string, locale: GuideLocale): Guide | undefined {
  const seed = guideSeeds.find((guide) => guide.slug === slug);
  if (!seed) return undefined;
  return toGuide(seed, locale);
}

export function getGuideSlugs(): string[] {
  return guideSeeds.map((guide) => guide.slug);
}

export function getGuideUpdatedAtMap(): Map<string, string> {
  return new Map(guideSeeds.map((guide) => [guide.slug, guide.updatedAt]));
}

export function getRelatedGuides(slug: string, locale: GuideLocale, limit = 3): Guide[] {
  const guide = guideSeeds.find((x) => x.slug === slug);
  if (!guide) return [];

  return guide.relatedSlugs
    .map((relatedSlug) => guideSeeds.find((x) => x.slug === relatedSlug))
    .filter((item): item is GuideSeed => Boolean(item))
    .slice(0, limit)
    .map((item) => toGuide(item, locale));
}

