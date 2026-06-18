# سیستم درآمدزایی Audit System

## نقش در شبکه درآمدی

Audit System نقش **موتور اثبات تخصص** و **Lead Magnet** را دارد.

## معماری

```
Portfolio (CTA: Try Free Audit) → Audit System (گزارش رایگان) → Lead → مشتری پولی
```

## استراتژی Lead Magnet

### رایگان: Site Audit Tool

**ویژگی‌ها:**
- ارزیابی خودکار سایت
- بررسی SEO فنی
- تحلیل عملکرد
- بررسی امنیت پایه
- گزارش قابل دانلود

**هدف:**
- جذب Lead با ارائه ارزش رایگان
- نمایش تخصص فنی
- ایجاد نیاز به خدمات پیشرفته

### پولی: Comprehensive Audit

**سطح 1: Basic Audit ($299)**
- همه موارد رایگان
- بررسی عمیق‌تر امنیت
- توصیه‌های اولویت‌بندی شده
- 30 دقیقه مشاوره ویدیویی
- **تحویل:** 48 ساعت

**سطح 2: Professional Audit ($499)**
- همه موارد Basic
- بررسی کد منبع
- تست نفوذ پایه
- گزارش مستند 20+ صفحه
- 1 ساعت مشاوره
- **تحویل:** 72 ساعت

**سطح 3: Enterprise Audit ($999)**
- همه موارد Professional
- تست نفوذ کامل
- بررسی معماری
- طرح اقدام 90 روزه
- 2 ساعت مشاوره
- 30 روز پشتیبانی
- **تحویل:** 1 هفته

## معماری فنی

### Worker Queue System

**مسیر:** `src/worker/index.ts`

**جریان کار:**
```
User Submit → Job Queue → Worker Processing → Report Generation → Email Notification
```

**وضعیت‌های Job:**
- `pending`: در صف
- `processing`: در حال پردازش
- `completed`: تکمیل شده
- `failed`: خطا

### API Routes

**مسیرهای موجود:**
- `POST /api/audit/submit` - ثبت درخواست audit
- `GET /api/audit/status/[id]` - وضعیت audit
- `GET /api/audit/report/[id]` - دریافت گزارش
- `POST /api/audit/payment` - پرداخت برای audit پیشرفته

### Database Models

**AuditRequest:**
```prisma
model AuditRequest {
  id          String   @id @default(cuid())
  url         String
  email       String
  tier        String   @default("free") // 'free' | 'basic' | 'professional' | 'enterprise'
  status      String   @default("pending")
  reportUrl   String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
  
  @@index([email])
  @@index([status])
}
```

## قیف تبدیل

### مرحله 1: Awareness (از Portfolio)
- کاربر CTA "Try Free Audit" را می‌بیند
- کلیک و ورود به Audit System

### مرحله 2: Lead Capture
- کاربر URL سایت را وارد می‌کند
- ایمیل را وارد می‌کند (lead capture!)
- Submit می‌کند

### مرحله 3: Value Delivery
- گزارش رایگان ایجاد می‌شود
- ایمیل با لینک گزارش ارسال می‌شود
- کاربر مشکلات سایت را می‌بیند

### مرحله 4: Upsell
- در انتهای گزارش: CTA برای audit پیشرفته
- پیشنهاد مشاوره شخصی
- قیمت‌گذاری شفاف

### مرحله 5: Conversion
- کاربر یکی از پلن‌های پولی را انتخاب می‌کند
- پرداخت آنلاین (Stripe/Zarinpal)
- تبدیل به مشتری

## ردیابی تحلیلی

### رویدادهای کلیدی

```typescript
// ثبت درخواست audit
analytics.track({
  site: 'audit',
  event: 'audit_submit',
  properties: {
    tier: 'free',
    referrer: document.referrer,
  },
});

// مشاهده گزارش
analytics.track({
  site: 'audit',
  event: 'report_view',
  properties: {
    auditId: '...',
  },
});

// کلیک روی upsell CTA
analytics.track({
  site: 'audit',
  event: 'upsell_click',
  properties: {
    targetTier: 'basic',
  },
});

// تکمیل خرید
analytics.track({
  site: 'audit',
  event: 'conversion',
  properties: {
    type: 'audit_purchase',
    value: 299,
    tier: 'basic',
  },
});
```

## معیارهای موفقیت

### ترافیک
- **از Portfolio:** 50-100 بازدید/ماه
- **Audit Submissions:** 30-60/ماه (60% conversion)

### تبدیل
- **Free Audit → Paid:** هدف 10-20%
- **Paid Audit → Consulting:** هدف 30-40%

### درآمد
- **از Audit مستقیم:** $1K-3K/ماه (10 basic @ $299)
- **از Consulting پس از Audit:** $2K-5K/ماه
- **Total:** $3K-8K/ماه

## Automation Scripts

### Roadmap Automation
```bash
pnpm roadmap:run
```

### SEO Audit
```bash
pnpm seo:audit
```

### Payment Preflight
```bash
pnpm payment:preflight:strict
```

### Deployment Readiness
```bash
pnpm deploy:readiness
```

## یکپارچگی با سیستم Analytics

**Endpoint:** `https://alirezasafaeisystems.ir/api/track`

همه رویدادهای Audit System به Analytics API ارسال می‌شوند:

```typescript
await fetch('https://alirezasafaeisystems.ir/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site: 'audit',
    event: 'audit_submit',
    sessionId: getSessionId(),
    timestamp: Date.now(),
    properties: { ... },
  }),
});
```

## صفحات کلیدی

### 1. Landing Page (/)
- توضیح مختصر Audit
- فرم ورودی (URL + Email)
- Trust signals
- Sample report link

### 2. Sample Report (/sample-report)
- نمونه گزارش واقعی
- نمایش کیفیت خروجی
- CTA برای audit خودشان

### 3. Pricing (/pricing) [آینده]
- مقایسه Free/Basic/Pro/Enterprise
- قیمت‌گذاری شفاف
- FAQ

### 4. Report Page (/report/[id])
- نمایش گزارش
- CTA upsell
- گزینه دانلود PDF

## راه‌اندازی محلی

```bash
# نصب وابستگی‌ها
pnpm install

# مایگریت دیتابیس
npx prisma migrate dev

# اجرا
pnpm dev

# اجرای Worker (ترمینال جداگانه)
pnpm worker:dev

# تست با درخواست نمونه
pnpm jobs:enqueue:sample
```

## دیپلوی Production

```bash
# بیلد
pnpm build

# مایگریت دیتابیس
npx prisma migrate deploy

# دیپلوی به VPS
# استفاده از اسکریپت‌های موجود

# ریستارت سرویس‌ها
pm2 restart audit-system
pm2 restart audit-worker
```

## مستندات تکمیلی

- [System Overview](../../docs/architecture/system-overview.md)
- [Worker Architecture](../../docs/backend/worker-queue.md)
- [Payment Integration](../../docs/api/billing.md)

---

**آخرین بروزرسانی:** 2026-06-18
**نسخه:** 0.1.0
**وضعیت:** Production-ready (Core audit flow operational)
