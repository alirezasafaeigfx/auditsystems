import type { CaseStudySeed } from "./index";

const ecommerceImprovement: CaseStudySeed = {
  slug: "ecommerce-improvement",
  updatedAt: "2026-07-05",
  fa: {
    title: "بهبود عملکرد فروشگاه اینترنتی",
    client: "فروشگاه اینترنتی ایران‌کالا",
    problem: "فروشگاه اینترنتی با مشکلات متعددی روبرو بود: بارگذاری کند صفحات، تگ‌های alt تصاویر، عدم وجود هدرهای امنیتی، و تجربه کاربری ضعیف موبایل. این مشکلات مستقیماً بر نرخ تبدیل و رتبه سئو تأثیر گذاشته بود.",
    findings: [
      "12 مشکل بحرانی شناسایی شد شامل مشکلات امنیتی و عملکردی",
      "8 مشکل مهم در بهینه‌سازی تصاویر و بارگذاری منابع",
      "15 مشکل متوسط در ساختار HTML و داده‌های ساختاریافته",
      "عدم وجود هدرهای امنیتی CSP و X-Frame-Options",
      "تصاویر بدون alt text و فشرده‌سازی نشده",
      "بارگذاری سنگین اسکریپت‌های ثالث"
    ],
    recommendations: [
      "پیاده‌سازی فشرده‌سازی Brotli و بهینه‌سازی تصاویر",
      "افزودن هدرهای امنیتی به تمام صفحات",
      "بهبود طراحی ریسپانسیو موبایل",
      "بهینه‌سازی بارگذاری اسکریپت‌های ثالث",
      "پیاده‌سازی Lazy Loading برای تصاویر",
      "اضافه کردن داده‌های ساختاریافته Product"
    ],
    result: "پس از اجرای توصیه‌ها، سرعت بارگذاری 40% بهبود یافت و نرخ تبدیل موبایل 25% افزایش پیدا کرد. رتبه سئوی فروشگاه از صفحه سوم به صفحه اول گوگل رسید.",
    scoreBefore: 35,
    scoreAfter: 78,
    cta: "فروشگاه اینترنتی خود را رایگان بررسی کنید"
  },
  en: {
    title: "E-Commerce Performance Improvement",
    client: "IranKala Online Store",
    problem: "The e-commerce store faced multiple issues: slow page loading, missing image alt tags, no security headers, and poor mobile user experience. These problems directly impacted conversion rates and SEO rankings.",
    findings: [
      "12 critical issues identified including security and performance problems",
      "8 high-priority issues in image optimization and resource loading",
      "15 medium issues in HTML structure and structured data",
      "Missing CSP and X-Frame-Options security headers",
      "Images without alt text and uncompressed",
      "Heavy third-party script loading"
    ],
    recommendations: [
      "Implement Brotli compression and image optimization",
      "Add security headers to all pages",
      "Improve mobile responsive design",
      "Optimize third-party script loading",
      "Implement Lazy Loading for images",
      "Add Product structured data"
    ],
    result: "After implementing recommendations, page load speed improved by 40% and mobile conversions increased by 25%. The store's SEO ranking moved from page three to Google's first page.",
    scoreBefore: 35,
    scoreAfter: 78,
    cta: "Check your e-commerce store for free"
  }
};

export default ecommerceImprovement;
