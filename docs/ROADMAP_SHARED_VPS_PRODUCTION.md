# Shared VPS Production Roadmap (No Timeline)

این سند تصمیم و اجرای واقعی استقرار `asdev-audit-ir` روی همان VPS فعلی را ثبت می‌کند.

## Deployment Decision
- الگوی هدف: اپ مستقل روی زیرساخت مشترک
- دامنه پیشنهادی production: `audit.alirezasafaeisystems.ir`
- دامنه پیشنهادی staging: `staging.audit.alirezasafaeisystems.ir`
- اصل طراحی: shared host, isolated runtime (PM2/env/releases/logs)
- وضعیت اجرا: `Done` (production + staging live)

## Current Production Snapshot (Updated: 2026-06-09)
| Area | Current State | Outcome |
|---|---|---|
| Public URL | `https://audit.alirezasafaeisystems.ir/` | production live |
| Release path | `/var/www/asdev-audit-ir/releases/production/20260609T175200Z-local-latest` | latest local deployment |
| PM2 web app | `asdev-audit-ir-production-web` | online |
| PM2 worker app | `asdev-audit-ir-production-worker` | online |
| Web port | `127.0.0.1:3010` | isolated from the other live projects |
| DB Engine | PostgreSQL on `127.0.0.1:5432` | used by `asdev_audit_production` |
| Env file | `/var/www/asdev-audit-ir/shared/env/production.env` | secrets excluded from docs |

## Historical Infrastructure Snapshot (Measured: 2026-02-23 23:37 +03:30)
| Area | Current State | Outcome |
|---|---|---|
| CPU | 4 vCPU | کافی برای اضافه‌شدن یک Next.js service دیگر |
| RAM | 7.8Gi total, ~948Mi used, ~6.5Gi available | ظرفیت مناسب |
| Swap | 2.1Gi total (2G swapfile + 128M partition) | baseline hardening اعمال شد |
| Disk | 59G total, 39G free | ظرفیت مناسب |
| Load Avg | 0.10 / 0.44 / 0.69 | فشار پایین |
| Running Node Apps | 6 PM2 apps (3 production + 3 staging) | پایدار روی VPS مشترک |
| Bound App Ports | 3000, 3001, 3002, 3003, 3010, 3011 | ایزولیشن کامل runtime |
| DB Engine | PostgreSQL 14 | سازگار با پروژه |
| Existing release footprint | `my-portfolio` + `persian-tools` + `asdev-audit-ir` (retention active) | تحت کنترل با retention + logrotate |

## Live Validation Snapshot
- `https://alirezasafaeisystems.ir/`:
  - HTTP -> HTTPS redirect فعال
  - روت فارسی بدون پسوند `/fa` سرو می‌شود
- `https://persiantoolbox.ir`:
  - HTTP -> HTTPS redirect فعال
  - cookie پیش‌فرض `ptb_locale=fa` تنظیم می‌شود
- `https://audit.alirezasafaeisystems.ir`:
  - HTTP -> HTTPS redirect فعال
  - روت فارسی به‌صورت پیش‌فرض سرو می‌شود (`lang="fa"`, `dir="rtl"`)
- `GET https://audit.alirezasafaeisystems.ir/api/ready` -> `200`
- وضعیت staging در VPS جدید در این سند تأیید نشده است؛ قبل از استفاده دوباره healthcheck جداگانه بگیرید.
- نکته probe: برای audit app معیار health روی `GET` سنجیده می‌شود؛ `HEAD` در بعضی مسیرها می‌تواند رفتار متفاوت نشان دهد.

## Work Packages

### 1) Host Hardening Baseline
- [x] افزایش swap از 128MB به 2GB.
- [x] بازبینی growth لاگ‌ها و حفظ release retention.
- [x] تایید باقی‌ماندن فضای آزاد دیسک بالاتر از 30%.

### 2) Isolated Runtime Setup
- [x] استفاده از مسیر استاندارد: `/var/www/asdev-audit-ir`.
- [x] env fileها:
  - `/var/www/asdev-audit-ir/shared/env/production.env`
  - `/var/www/asdev-audit-ir/shared/env/staging.env`
- [x] PM2 app names:
  - `asdev-audit-ir-production`
  - `asdev-audit-ir-staging`

### 3) Nginx + TLS
- [x] site config با template موجود `ops/nginx/asdev-audit-ir.conf`.
- [x] production/staging روی پورت‌های `3010` و `3011`.
- [x] صدور SSL و enforce کردن redirect کامل HTTP->HTTPS.

### 4) Production Data/Env Readiness
- [x] تکمیل envهای حیاتی: `DATABASE_URL`, `APP_BASE_URL`, `APP_BASE_URL_STRICT=true`, payment, redis, secrets.
- [x] اجرای:
  - `pnpm run payment:preflight:strict`
  - `pnpm prisma migrate deploy`
  - `pnpm run automation:run`

### 5) Go-Live Quality Gates
- [x] سرویس روی `GET /api/live` و `GET /api/ready` پاسخ 200 می‌دهد.
- [x] `sitemap.xml` و `robots.txt` روی دامنه production معتبر هستند.
- [x] callback پرداخت endpoint در production route حاضر است (نیازمند merchant live برای end-to-end payment success).

### 6) Main-Site Integration
- [x] لینک داخلی از سایت اصلی `alirezasafaeisystems.ir` به audit app اضافه شد.
- [x] anchor text و placement با رویکرد conversion-oriented تنظیم شد.

## Entry Criteria
- دسترسی DNS برای رکوردهای production/staging ساب‌دامین
- دسترسی sudo روی VPS
- دسترسی دیتابیس production معتبر
- merchant/payment credential معتبر

## Acceptance Criteria
- [x] اپ production روی ساب‌دامین جدید در دسترس است.
- [x] rollback با `ops/deploy/rollback.sh --env production` قابل اجرا است.
- [x] خطای بحرانی health/readiness وجود ندارد.
- [x] preflight و automation gate روی target host بدون failure بحرانی اجرا می‌شوند.

## Risk Notes
- ریسک اصلی باقیمانده: هم‌پوشانی PM2/systemd در صورت افزودن سرویس جدید باید فقط از `pm2-deploy.service` مدیریت شود.
- ریسک عملیاتی: growth release folders نیازمند retention مستمر و مانیتورینگ ماهانه است.
- ریسک تجاری: فعال نبودن merchant live باعث ناقص‌بودن سناریوی payment success واقعی می‌شود.
- ریسک مانیتورینگ: اگر health-checker بیرونی روی `HEAD` تنظیم شده باشد، احتمال false-negative وجود دارد؛ probe را روی `GET /api/ready` قرار دهید.
