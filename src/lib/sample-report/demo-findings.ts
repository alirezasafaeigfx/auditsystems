import type { ChecklistItem, SampleFinding, SampleSeverity } from "./types";
import { CATEGORY_ORDER, SAMPLE_DEMO_URL, SEVERITY_ORDER } from "./types";

export const demoFindings: SampleFinding[] = [
  {
    code: "NO_CSP_HEADER",
    severity: "CRITICAL",
    category: "security",
    title: {
      fa: "هدر Content-Security-Policy موجود نیست",
      en: "Content-Security-Policy header is missing",
    },
    description: {
      fa: "سایت هدر CSP را ارسال نمی‌کند. این امر در برابر حملات XSS آسیب‌پذیری ایجاد می‌کند.",
      en: "The site does not send a CSP header, which increases XSS risk.",
    },
    evidence: {
      fa: "اسکن هدرهای پاسخ: هیچ مقدار Content-Security-Policy در پاسخ HTTPS صفحه اصلی یافت نشد.",
      en: "Response header scan: no Content-Security-Policy value on the HTTPS homepage response.",
    },
    recommendation: {
      fa: "هدر Content-Security-Policy را با سیاست‌های مناسب پیاده‌سازی کنید. ابتدا report-only و سپس enforce.",
      en: "Implement Content-Security-Policy with appropriate directives. Start report-only, then enforce.",
    },
    impact: {
      fa: "ریسک امنیتی بالا برای محتوای تزریق‌شده و اسکریپت‌های شخص ثالث.",
      en: "High security risk for injected content and third-party scripts.",
    },
    owner: "developer",
    difficulty: "medium",
    priority: "P0",
    evidenceType: "confirmed",
  },
  {
    code: "NO_HSTS",
    severity: "HIGH",
    category: "security",
    title: {
      fa: "هدر HSTS موجود نیست",
      en: "HSTS header is missing",
    },
    description: {
      fa: "HTTP Strict-Transport-Security تنظیم نشده است.",
      en: "HTTP Strict-Transport-Security is not configured.",
    },
    evidence: {
      fa: "هدر Strict-Transport-Security در پاسخ سرور برای دامنه نمونه absent است.",
      en: "Strict-Transport-Security is absent on the sample domain response.",
    },
    recommendation: {
      fa: "هدر HSTS با max-age مناسب (حداقل یک سال) و includeSubDomains در صورت نیاز اضافه کنید.",
      en: "Add HSTS with an appropriate max-age (at least one year) and includeSubDomains if needed.",
    },
    impact: {
      fa: "کاربران ممکن است در برخی شبکه‌ها به HTTP downgrade هدایت شوند.",
      en: "Users may be exposed to HTTP downgrade on some networks.",
    },
    owner: "hosting_admin",
    difficulty: "easy",
    priority: "P1",
    evidenceType: "confirmed",
  },
  {
    code: "CWV_LCP_POOR_PROXY",
    severity: "HIGH",
    category: "performance",
    title: {
      fa: "LCP بالا: بیش از ۴ ثانیه",
      en: "High LCP: over 4 seconds",
    },
    description: {
      fa: "بزرگترین عنصر نقاشی (LCP) بیش از ۴ ثانیه بارگذاری می‌شود.",
      en: "Largest Contentful Paint exceeds 4 seconds on the sample run.",
    },
    evidence: {
      fa: "اندازه‌گیری lab روی anonymous-example.ir: LCP ≈ 4.2s در شبکه 4G شبیه‌سازی‌شده.",
      en: "Lab measurement on anonymous-example.ir: LCP ≈ 4.2s on simulated 4G.",
    },
    recommendation: {
      fa: "تصاویر above-the-fold را فشرده کنید، preload برای LCP اضافه کنید، lazy-load برای تصاویر غیرضروری.",
      en: "Compress above-the-fold images, preload the LCP element, lazy-load non-critical images.",
    },
    impact: {
      fa: "تجربه کاربری ضعیف و سیگنال منفی برای سئو و تبدیل.",
      en: "Poor UX and negative signal for SEO and conversion.",
    },
    owner: "developer",
    difficulty: "medium",
    priority: "P1",
    evidenceType: "hypothesis",
  },
  {
    code: "HIGH_CLS",
    severity: "HIGH",
    category: "performance",
    title: {
      fa: "CLS بالا: جابجایی عناصر در حین بارگذاری",
      en: "High CLS: layout shift during load",
    },
    description: {
      fa: "نرخ جابجایی تجمعی (CLS) بالاتر از حد توصیه‌شده است.",
      en: "Cumulative Layout Shift exceeds the recommended threshold.",
    },
    evidence: {
      fa: "CLS ≈ 0.18 در اجرای نمونه؛ بنر و فونت بدون ابعاد ثابت باعث shift شده‌اند.",
      en: "CLS ≈ 0.18 in the sample run; banner and web fonts without reserved space caused shifts.",
    },
    recommendation: {
      fa: "width/height برای رسانه‌ها، font-display و فضای رزرو برای محتوای داینامیک تنظیم کنید.",
      en: "Set width/height on media, tune font-display, reserve space for dynamic content.",
    },
    impact: {
      fa: "کلیک‌های اشتباه و افت اعتماد کاربر در موبایل.",
      en: "Mis-clicks and reduced trust on mobile.",
    },
    owner: "developer",
    difficulty: "medium",
    priority: "P1",
    evidenceType: "hypothesis",
  },
  {
    code: "NO_CANONICAL",
    severity: "HIGH",
    category: "seo",
    title: {
      fa: "URL canonical تنظیم نشده است",
      en: "Canonical URL is missing",
    },
    description: {
      fa: "صفحات فاقد تگ canonical هستند.",
      en: "Pages lack a canonical link element.",
    },
    evidence: {
      fa: "در HTML صفحه اصلی نمونه، link[rel=canonical] یافت نشد.",
      en: "Sample homepage HTML has no link[rel=canonical].",
    },
    recommendation: {
      fa: "canonical یکتا برای هر URL ایندکس‌پذیر در head اضافه کنید.",
      en: "Add a single canonical URL per indexable page in the document head.",
    },
    impact: {
      fa: "احتمال ایندکس نسخه‌های تکراری و اتلاف بودجه خزش.",
      en: "Risk of duplicate indexing and wasted crawl budget.",
    },
    owner: "seo",
    difficulty: "easy",
  },
  {
    code: "NO_OG_TAGS",
    severity: "MEDIUM",
    category: "seo",
    title: {
      fa: "تگ‌های Open Graph موجود نیست",
      en: "Open Graph tags are missing",
    },
    description: {
      fa: "اشتراک‌گذاری در شبکه‌های اجتماعی پیش‌نمایش ضعیف دارد.",
      en: "Social sharing previews are incomplete.",
    },
    evidence: {
      fa: "og:title و og:image در head صفحه اصلی نمونه absent هستند.",
      en: "og:title and og:image are absent on the sample homepage head.",
    },
    recommendation: {
      fa: "og:title، og:description، og:image و og:url را برای صفحات کلیدی اضافه کنید.",
      en: "Add og:title, og:description, og:image, and og:url on key pages.",
    },
    impact: {
      fa: "CTR پایین‌تر در اشتراک‌گذاری اجتماعی.",
      en: "Lower click-through on social shares.",
    },
    owner: "seo",
    difficulty: "easy",
  },
  {
    code: "THIN_META_DESCRIPTION",
    severity: "MEDIUM",
    category: "content",
    title: {
      fa: "توضیحات متا کوتاه یا تکراری",
      en: "Thin or duplicate meta descriptions",
    },
    description: {
      fa: "چند صفحه مهم توضیح متا یکسان یا کم‌اطلاعات دارند.",
      en: "Several important pages share identical or low-information meta descriptions.",
    },
    evidence: {
      fa: "۳ URL نمونه در سایت map شده با meta description یکسان زیر ۵۰ کاراکتر.",
      en: "Three mapped sample URLs share a meta description under 50 characters.",
    },
    recommendation: {
      fa: "برای هر صفحه intent منحصربه‌فرد، توضیح ۱۲۰–۱۶۰ کاراکتری بنویسید.",
      en: "Write unique 120–160 character descriptions aligned to each page intent.",
    },
    impact: {
      fa: "Snippet ضعیف در SERP و نرخ کلیک پایین‌تر.",
      en: "Weak SERP snippets and lower organic CTR.",
    },
    owner: "content_manager",
    difficulty: "easy",
  },
  {
    code: "THIRD_PARTY_FONTS",
    severity: "MEDIUM",
    category: "performance",
    title: {
      fa: "فونت از CDN شخص ثالث",
      en: "Fonts loaded from third-party CDN",
    },
    description: {
      fa: "وابستگی به Google Fonts در برخی شبکه‌ها بارگذاری را کند یا قطع می‌کند.",
      en: "Google Fonts dependency may slow or block rendering on some networks.",
    },
    evidence: {
      fa: "درخواست به fonts.googleapis.com در waterfall صفحه اصلی نمونه مشاهده شد.",
      en: "Request to fonts.googleapis.com observed in the sample homepage waterfall.",
    },
    recommendation: {
      fa: "فونت‌ها را self-host کنید یا fallback stack قابل اتکا تعریف کنید.",
      en: "Self-host fonts or define a reliable fallback stack.",
    },
    impact: {
      fa: "FOIT/FOUT و تاخیر در رندر متن.",
      en: "FOIT/FOUT and delayed text rendering.",
    },
    owner: "developer",
    difficulty: "medium",
  },
  {
    code: "IMG_MISSING_ALT",
    severity: "MEDIUM",
    category: "accessibility",
    title: {
      fa: "۷ تصویر بدون متن جایگزین (alt)",
      en: "7 images missing alt text",
    },
    description: {
      fa: "تصاویر معنادار بدون alt برای screen reader در دسترس نیستند.",
      en: "Meaningful images lack alt text for screen reader users.",
    },
    evidence: {
      fa: "اسکن DOM نمونه: ۷ تگ img بدون alt غیرخالی در صفحات اصلی.",
      en: "Sample DOM scan: 7 img tags without non-empty alt on key pages.",
    },
    recommendation: {
      fa: "alt توصیفی برای تصاویر محتوایی؛ alt=\"\" برای تزئینی.",
      en: "Descriptive alt on content images; alt=\"\" on decorative images.",
    },
    impact: {
      fa: "نقض WCAG و تجربه ناقص برای کاربران کم‌بینا.",
      en: "WCAG gap and incomplete experience for low-vision users.",
    },
    owner: "content_manager",
    difficulty: "easy",
  },
  {
    code: "MIXED_CONTENT",
    severity: "MEDIUM",
    category: "security",
    title: {
      fa: "محتوای ترکیبی (HTTP روی HTTPS)",
      en: "Mixed content (HTTP on HTTPS)",
    },
    description: {
      fa: "برخی منابع هنوز از HTTP بارگذاری می‌شوند.",
      en: "Some assets still load over HTTP on HTTPS pages.",
    },
    evidence: {
      fa: "۲ درخواست تصویر با scheme http:// در صفحه نمونه شناسایی شد.",
      en: "Two image requests using http:// detected on the sample page.",
    },
    recommendation: {
      fa: "همه URLهای asset را به HTTPS ارتقا دهید.",
      en: "Upgrade all asset URLs to HTTPS.",
    },
    impact: {
      fa: "هشدار مرورگر و مسدود شدن منابع در حالت strict.",
      en: "Browser warnings and blocked assets in strict mode.",
    },
    owner: "developer",
    difficulty: "easy",
  },
  {
    code: "MOBILE_TAP_TARGET",
    severity: "MEDIUM",
    category: "ux_mobile",
    title: {
      fa: "اهداف لمسی کوچک در موبایل",
      en: "Small tap targets on mobile",
    },
    description: {
      fa: "برخی دکمه‌ها و لینک‌ها کوچکتر از ۴۴×۴۴ پیکسل هستند.",
      en: "Some buttons and links are smaller than 44×44px.",
    },
    evidence: {
      fa: "۵ عنصر تعاملی در viewport موبایل ۳۹۰px عرض کمتر از ۴۴px ارتفاع دارند.",
      en: "Five interactive elements under 44px height at 390px mobile viewport.",
    },
    recommendation: {
      fa: "padding و min-height/min-width برای کنترل‌های لمسی افزایش دهید.",
      en: "Increase padding and min-height/min-width on touch controls.",
    },
    impact: {
      fa: "نرخ خطای لمس و نارضایتی کاربر موبایل.",
      en: "Touch error rate and mobile frustration.",
    },
    owner: "developer",
    difficulty: "easy",
  },
  {
    code: "NO_STRUCTURED_DATA",
    severity: "LOW",
    category: "seo",
    title: {
      fa: "داده ساختاریافته (Schema.org) موجود نیست",
      en: "Structured data (Schema.org) is missing",
    },
    description: {
      fa: "JSON-LD برای Organization/WebSite در صفحه اصلی نیست.",
      en: "No JSON-LD for Organization/WebSite on the homepage.",
    },
    evidence: {
      fa: "هیچ script[type=application/ld+json] در HTML نمونه یافت نشد.",
      en: "No script[type=application/ld+json] found in sample HTML.",
    },
    recommendation: {
      fa: "WebSite و Organization JSON-LD با URL و نام معتبر اضافه کنید.",
      en: "Add WebSite and Organization JSON-LD with valid name and URL.",
    },
    impact: {
      fa: "از دست رفتن فرصت rich results.",
      en: "Missed rich result eligibility.",
    },
    owner: "seo",
    difficulty: "easy",
  },
  {
    code: "STATIC_ASSETS_NO_LONG_CACHE",
    severity: "LOW",
    category: "performance",
    title: {
      fa: "کش کوتاه برای فایل‌های استاتیک",
      en: "Short cache TTL on static assets",
    },
    description: {
      fa: "CSS/JS با هدر cache کوتاه ارسال می‌شوند.",
      en: "CSS/JS served with short cache headers.",
    },
    evidence: {
      fa: "cache-control: max-age=3600 روی ۳ فایل استاتیک نسخه‌دار نمونه.",
      en: "cache-control: max-age=3600 on three versioned sample static files.",
    },
    recommendation: {
      fa: "برای فایل‌های hash‌شده max-age بلند (≥۱ سال) و immutable تنظیم کنید.",
      en: "Set long max-age (≥1 year) and immutable on hashed static files.",
    },
    impact: {
      fa: "بار اضافی شبکه برای بازدیدهای تکراری.",
      en: "Extra network cost on repeat visits.",
    },
    owner: "hosting_admin",
    difficulty: "easy",
  },
];

export const securityHeadersChecklist: ChecklistItem[] = [
  {
    key: "csp",
    label: { fa: "Content-Security-Policy", en: "Content-Security-Policy" },
    status: "missing",
  },
  {
    key: "hsts",
    label: { fa: "Strict-Transport-Security", en: "Strict-Transport-Security" },
    status: "missing",
  },
  {
    key: "xcto",
    label: { fa: "X-Content-Type-Options", en: "X-Content-Type-Options" },
    status: "present",
  },
  {
    key: "referrer",
    label: { fa: "Referrer-Policy", en: "Referrer-Policy" },
    status: "present",
  },
  {
    key: "permissions",
    label: { fa: "Permissions-Policy", en: "Permissions-Policy" },
    status: "missing",
  },
];

export const seoBasicsChecklist: ChecklistItem[] = [
  {
    key: "title",
    label: { fa: "عنوان صفحه (title)", en: "Page title" },
    status: "present",
  },
  {
    key: "meta",
    label: { fa: "توضیحات متا", en: "Meta description" },
    status: "present",
  },
  {
    key: "canonical",
    label: { fa: "URL canonical", en: "Canonical URL" },
    status: "missing",
  },
  {
    key: "og",
    label: { fa: "Open Graph", en: "Open Graph" },
    status: "missing",
  },
];

const SEVERITY_RANK: Record<SampleSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function getTopUrgentFindings(findings: SampleFinding[], limit = 3): SampleFinding[] {
  return [...findings]
    .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, limit);
}

export function groupFindingsBySeverity(findings: SampleFinding[]): Map<SampleSeverity, SampleFinding[]> {
  const map = new Map<SampleSeverity, SampleFinding[]>();
  for (const severity of SEVERITY_ORDER) {
    const group = findings.filter((f) => f.severity === severity);
    if (group.length > 0) {
      map.set(severity, group);
    }
  }
  return map;
}

export function groupFindingsByCategory(findings: SampleFinding[]): Map<string, SampleFinding[]> {
  const map = new Map<string, SampleFinding[]>();
  for (const category of CATEGORY_ORDER) {
    const group = findings.filter((f) => f.category === category);
    if (group.length > 0) {
      map.set(category, group);
    }
  }
  return map;
}

export function countBySeverity(findings: SampleFinding[], severity: SampleSeverity): number {
  return findings.filter((f) => f.severity === severity).length;
}

export { SAMPLE_DEMO_URL };
