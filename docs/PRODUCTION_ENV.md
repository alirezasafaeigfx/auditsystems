# Production Environment Baseline

این راهنما فقط برای آماده‌سازی است و deploy واقعی نیازمند تایید جداگانه است.

## Required Variables
- `DATABASE_URL`: production postgres URL
- `APP_BASE_URL`: public https domain
- `APP_BASE_URL_STRICT=true`
- `IP_HASH_SALT`: random secret (>=32 chars)
- `DOWNLOAD_TOKEN_SECRET`: random secret (>=32 chars)
- `REPORT_ACCESS_SECRET`: stable random secret (>=32 UTF-8 bytes); rotating it revokes every protected-report access cookie
- `PAYMENT_PROVIDER_DEFAULT`: `ZARINPAL` یا provider مورد تایید
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `REQUIRE_DISTRIBUTED_RATE_LIMIT=true`
- `AUDIT_DNS_FAIL_OPEN` (اختیاری: true/false; در حالت پیش‌فرض `true`)
- `ZARINPAL_MERCHANT_ID` (when provider=ZARINPAL)
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (optional, for SEO measurement events)

## Validation Commands
```bash
pnpm run payment:preflight:strict
pnpm run payment:zarinpal:smoke
```

## Notes
- برای smoke واقعی، `APP_BASE_URL` باید publicly reachable باشد.
- اگر merchant فعال نیست، smoke با `SKIP` ثبت می‌شود.
- برای rollout پیشنهادی shared VPS مقدار `APP_BASE_URL` را روی `https://audit.alirezasafaeisystems.ir` قرار دهید.
