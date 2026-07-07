import type { CaseStudySeed } from "./index";

const wordpressSecurity: CaseStudySeed = {
  slug: "wordpress-security",
  updatedAt: "2026-07-05",
  fa: {
    title: "رفع مشکلات امنیتی وردپرس",
    client: "وب‌سایت شرکتی فناوری اطلاعات پردیس",
    problem: "وب‌سایت وردپرسی با آسیب‌پذیری‌های امنیتی متعددی روبرو بود: افزونه‌های قدیمی و به‌روز نشده، عدم وجود هدرهای CSP، پنل مدیریت در معرض دسترسی عمومی، و عدم رمزنگاری مناسب داده‌ها.",
    findings: [
      "5 مشکل امنیتی بحرانی شناسایی شد",
      "افزونه‌های قدیمی با آسیب‌پذیری‌های شناخته شده",
      "عدم وجود Content Security Policy",
      "پنل wp-admin در دسترس عموم",
      "عدم استفاده از HTTPS در تمام صفحات",
      "رمزهای عبور ضعیف مدیران"
    ],
    recommendations: [
      "به‌روزرسانی تمام افزونه‌ها و هسته وردپرس",
      "پیاده‌سازی CSP و هدرهای امنیتی",
      "محدودسازی دسترسی به پنل مدیریت",
      "اجباری کردن HTTPS",
      "پیاده‌سازی احراز هویت دو مرحله‌ای",
      "استفاده از WAF و محدودسازی نرخ درخواست"
    ],
    result: "تمام مشکلات امنیتی بحرانی برطرف شد و امتیاز امنیتی سایت از 28 به 85 بهبود یافت. وب‌سایت اکنون استانداردهای امنیتی مدرن را رعایت می‌کند.",
    scoreBefore: 28,
    scoreAfter: 85,
    cta: "امنیت وب‌سایت وردپرسی خود را بررسی کنید"
  },
  en: {
    title: "WordPress Security Vulnerability Fix",
    client: "Pardis IT Corporate Website",
    problem: "The WordPress website had multiple security vulnerabilities: outdated plugins, no CSP headers, exposed admin panel, and inadequate data encryption.",
    findings: [
      "5 critical security issues identified",
      "Outdated plugins with known vulnerabilities",
      "Missing Content Security Policy",
      "wp-admin panel publicly accessible",
      "HTTPS not enforced on all pages",
      "Weak admin passwords"
    ],
    recommendations: [
      "Update all plugins and WordPress core",
      "Implement CSP and security headers",
      "Restrict admin panel access",
      "Enforce HTTPS",
      "Implement two-factor authentication",
      "Deploy WAF and rate limiting"
    ],
    result: "All critical security issues were resolved and the site's security score improved from 28 to 85. The website now meets modern security standards.",
    scoreBefore: 28,
    scoreAfter: 85,
    cta: "Check your WordPress website security"
  }
};

export default wordpressSecurity;
