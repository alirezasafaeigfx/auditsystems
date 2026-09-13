import type { BlogPost } from "./index";

const websiteSpeedTest: BlogPost = {
  slug: "website-speed-test",
  updatedAt: "2026-09-13",
  relatedSlugs: ["seo-audit-checklist", "wordpress-seo", "ecommerce-audit"],
  sources: [
    { label: "Web Vitals", url: "https://web.dev/articles/vitals" },
    { label: "Core Web Vitals thresholds", url: "https://web.dev/articles/defining-core-web-vitals-thresholds" }
  ],
  fa: {
    title: "بررسی و بهینه‌سازی سرعت سایت: راهنمای جامع برای کسب‌وکارهای آنلاین",
    description: "آموزش بررسی سرعت سایت و بهینه‌سازی Core Web Vitals شامل LCP، CLS و INP. راهکارهای عملی برای کاهش زمان بارگذاری و بهبود تجربه کاربری.",
    sections: [
      "چرا سرعت سایت مهم است؟",
      "اندازه‌گیری سرعت سایت",
      "Core Web Vitals چیست؟",
      "بهینه‌سازی LCP",
      "بهینه‌سازی CLS",
      "بهینه‌سازی INP",
      "بهینه‌سازی تصاویر",
      "کش و CDN",
      "بهینه‌سازی کد",
      "ابزارهای بررسی سرعت",
      "نتیجه‌گیری"
    ],
    content: `
## چرا سرعت سایت مهم است؟

## محدوده ASDEV Audit

نسخه فعلی گزارش ASDEV Audit داده میدانی Core Web Vitals را اندازه‌گیری نمی‌کند و برای performance امتیاز قطعی نمی‌سازد. برای قضاوت درباره تجربه واقعی کاربران، داده میدانی را در PageSpeed Insights، CrUX یا Search Console و در صدک ۷۵ موبایل و دسکتاپ بررسی کنید. نتیجه آزمایشگاهی را جای داده میدانی گزارش نکنید.

سرعت و پاسخ‌گویی می‌تواند بر تجربه کاربر اثر بگذارد. اثر تجاری یا جست‌وجویی هر سایت باید با داده همان سایت سنجیده شود.

## اندازه‌گیری سرعت سایت

برای اندازه‌گیری دقیق سرعت سایت، از معیارهای زیر استفاده کنید:

### Time to First Byte (TFB)

زمانی که طول می‌کشد مرورگر اولین بایت پاسخ سرور را دریافت کند. TFB خوب باید کمتر از 200 میلی‌ثانیه باشد.

### First Contentful Paint (FCP)

زمانی که طول می‌کشد اولین محتوای صفحه نمایش داده شود. FCP خوب باید کمتر از 1.8 ثانیه باشد.

### Largest Contentful Paint (LCP)

زمانی که طول می‌کشد بزرگ‌ترین عنصر محتوایی صفحه نمایش داده شود. LCP خوب باید کمتر از 2.5 ثانیه باشد.

### Cumulative Layout Shift (CLS)

میزان جابجایی غیرمنتظره عناصر صفحه. CLS خوب باید کمتر از 0.1 باشد.

### Interaction to Next Paint (INP)

زمان پاسخ‌دهی به تعاملات کاربر. INP خوب باید کمتر از 200 میلی‌ثانیه باشد.

## Core Web Vitals چیست؟

Core Web Vitals مجموعه‌ای از معیارهای تجربه کاربری است که گوگل برای رتبه‌بندی استفاده می‌کند:

- **LCP**: سرعت بارگذاری محتوای اصلی
- **CLS**: ثبات بصری صفحه
- **INP**: پاسخ‌دهی به تعاملات

## بهینه‌سازی LCP

### مشکلات رایج LCP

1. **تصاویر بزرگ**: تصاویر بدون بهینه‌سازی
2. **CSS رندر بلاکر**: فایل‌های CSS که رندر صفحه را مسدود می‌کنند
3. **JavaScript رندر بلاکر**: اسکریپت‌هایی که بارگذاری را به تأخیر می‌اندازند
4. **سرور کند**: زمان پاسخ‌دهی سرور بالا

### راهکارها

- بهینه‌سازی تصاویر و استفاده از فرمت‌های مدرن مانند WebP
- فشرده‌سازی CSS و JavaScript
- استفاده از CDN
- بهینه‌سازی سرور

## بهینه‌سازی CLS

### مشکلات رایج CLS

1. **ابعاد تصویر مشخص نیست**: مرورگر فضای تصویر را نمی‌داند
2. **محتوای داینامیک**: بنرهای تبلیغاتی یا فرم‌هایی که باعث جابجایی می‌شوند
3. **فونت‌های وب**: فونت‌هایی که باعث جابجایی متن می‌شوند

### راهکارها

- تعیین ابعاد تصاویر در HTML
- رزرو فضا برای محتوای داینامیک
- استفاده از font-display: swap

## بهینه‌سازی INP

### مشکلات رایج INP

1. **جاوااسکریپت سنگین**: اسکریپت‌هایی که主线程 را مسدود می‌کنند
2. **Event handlerهای طولانی**: پردازش‌های سنگین در رویدادها
3. **Layout thrashing**: تغییرات مکرر layout

### راهکارها

- تقسیم کار به واحدهای کوچکتر
- استفاده از requestIdleCallback
- بهینه‌سازی event handlerها

## بهینه‌سازی تصاویر

تصاویر بزرگ‌ترین مصرف‌کننده پهنای باند هستند:

### راهکارها

- استفاده از فرمت WebP یا AVIF
- بهینه‌سازی تصاویر با ابزارهایی مانند Sharp
- استفاده از lazy loading
- ریسپانسیو کردن تصاویر
- استفاده از CDN برای تصاویر

## کش و CDN

### کش مرورگر

- تعیین زمان انقضای مناسب برای فایل‌ها
- استفاده از cache-control headers
- استفاده از ETags

### CDN (شبکه تحویل محتوا)

- نزدیک‌ترین سرور به کاربر
- کاهش بار سرور اصلی
- بهبود سرعت بارگذاری

## بهینه‌سازی کد

### CSS

- حذف CSS استفاده نشده
- فشرده‌سازی فایل‌های CSS
- استفاده از critical CSS

### JavaScript

- حذف کد استفاده نشده
- Code splitting
- Tree shaking
- استفاده از async یا defer

## ابزارهای بررسی سرعت

- Google PageSpeed Insights
- GTmetrix
- WebPageTest
- Lighthouse
- Chrome DevTools

## نتیجه‌گیری

بهینه‌سازی سرعت فرآیندی مستمر است. ابتدا شواهد آزمایشگاهی و میدانی را جدا نگه دارید، سپس هر تغییر را با همان روش و شرایط دوباره اندازه بگیرید.
    `,
    cta: "ممیزی فنی را شروع کنید و محدودیت شواهد performance را در گزارش بررسی کنید"
  },
  en: {
    title: "Website Speed Test and Optimization: A Complete Guide for Online Businesses",
    description: "Learn to test website speed and optimize Core Web Vitals including LCP, CLS, and INP. Practical solutions to reduce load time and improve user experience.",
    sections: [
      "Why Website Speed Matters",
      "Measuring Website Speed",
      "What are Core Web Vitals?",
      "Optimizing LCP",
      "Optimizing CLS",
      "Optimizing INP",
      "Image Optimization",
      "Caching and CDN",
      "Code Optimization",
      "Speed Testing Tools",
      "Conclusion"
    ],
    content: `
## Why Website Speed Matters

## ASDEV Audit scope

The current ASDEV Audit does not measure field Core Web Vitals or assign a definitive performance score. Evaluate real-user experience with field data from PageSpeed Insights, CrUX, or Search Console at the 75th percentile for mobile and desktop. Do not report a lab sample as field evidence.

Speed and responsiveness can affect user experience. Measure the business and search impact with data from the site being evaluated.

## Measuring Website Speed

For accurate speed measurement, use these metrics:

### Time to First Byte (TFB)

Time it takes for the browser to receive the first byte of server response. Good TFB should be under 200 milliseconds.

### First Contentful Paint (FCP)

Time it takes for the first page content to display. Good FCP should be under 1.8 seconds.

### Largest Contentful Paint (LCP)

Time it takes for the largest content element to display. Good LCP should be under 2.5 seconds.

### Cumulative Layout Shift (CLS)

Amount of unexpected page element shifting. Good CLS should be under 0.1.

### Interaction to Next Paint (INP)

Time to respond to user interactions. Good INP should be under 200 milliseconds.

## What are Core Web Vitals?

Core Web Vitals is a set of user experience metrics that Google uses for ranking:

- **LCP**: Main content loading speed
- **CLS**: Visual page stability
- **INP**: Interaction responsiveness

## Optimizing LCP

### Common LCP Issues

1. **Large images**: Unoptimized images
2. **Render-blocking CSS**: CSS files that block rendering
3. **Render-blocking JavaScript**: Scripts that delay loading
4. **Slow server**: High server response time

### Solutions

- Optimize images and use modern formats like WebP
- Compress CSS and JavaScript
- Use CDN
- Optimize server

## Optimizing CLS

### Common CLS Issues

1. **Unspecified image dimensions**: Browser doesn't know image space
2. **Dynamic content**: Ad banners or forms causing shifts
3. **Web fonts**: Fonts causing text shifts

### Solutions

- Set image dimensions in HTML
- Reserve space for dynamic content
- Use font-display: swap

## Optimizing INP

### Common INP Issues

1. **Heavy JavaScript**: Scripts blocking main thread
2. **Long event handlers**: Heavy processing in events
3. **Layout thrashing**: Frequent layout changes

### Solutions

- Split work into smaller units
- Use requestIdleCallback
- Optimize event handlers

## Image Optimization

Images are the largest bandwidth consumers:

### Solutions

- Use WebP or AVIF formats
- Optimize images with tools like Sharp
- Use lazy loading
- Make images responsive
- Use CDN for images

## Caching and CDN

### Browser Caching

- Set appropriate file expiration times
- Use cache-control headers
- Use ETags

### CDN (Content Delivery Network)

- Closest server to user
- Reduces main server load
- Improves loading speed

## Code Optimization

### CSS

- Remove unused CSS
- Compress CSS files
- Use critical CSS

### JavaScript

- Remove unused code
- Code splitting
- Tree shaking
- Use async or defer

## Speed Testing Tools

- Google PageSpeed Insights
- GTmetrix
- WebPageTest
- Lighthouse
- Chrome DevTools

## Conclusion

Speed optimization is ongoing. Keep lab and field evidence separate, then measure each change again with the same method and conditions.
    `,
    cta: "Start a technical audit and review the report's performance-evidence limits"
  }
};

export default websiteSpeedTest;
