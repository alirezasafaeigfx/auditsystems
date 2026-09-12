# SEO Roadmap (3 Phases, No Timeline)

> Historical implementation plan, not current execution or growth acceptance. For the owner's 2026-08-31 paired mission use [the canonical roadmap](roadmaps/AUDIT_PUBLIC_EXPERIENCE.md), AU-08…13 [execution cards](execution/QUALITY_GROWTH_SPRINTS.md) and [shared quality contract](strategy/PAIRED_QUALITY_GROWTH_CONTRACT.md). Preserve proven helpers/content/analytics, verify current code and sources, and repair only real gaps. No phase below proves Google indexing, traffic, ranking or field outcomes without actual data.

این roadmap فقط بر اساس وضعیت واقعی repo طراحی شده و هیچ تخمین زمانی ندارد.

## Historical reported status — requires current verification
- Phase 1: previously reported implemented; current crawl/index/route acceptance is AU-09.
- Phase 2: previously reported implemented; content/schema/locale usefulness is checked in AU-09/AU-10.
- Phase 3: measurement foundation previously reported; live data/outcomes remain UNVERIFIED until authorized sources are inspected in AU-12/AU-13. Credentials unavailable does not mean the phase is fully accepted.

## Issue Mapping (Each Issue Exactly Once)
- Phase 1: `SEO-001`, `SEO-002`, `SEO-003`, `SEO-004`
- Phase 2: `SEO-005`, `SEO-006`, `SEO-007`, `SEO-008`
- Phase 3: `SEO-009`

---

## Phase 1 — Stabilize Crawl & Index Foundation
### Goal
حذف ریسک‌های بحرانی crawl/index و canonical تا index سایت تمیز، قابل پیش‌بینی و قابل دفاع شود.

### Scope
- Included: canonical governance، noindex policy، sitemap hygiene
- Excluded: توسعه محتوایی و برنامه authority

### Entry Criteria
- دسترسی به env production برای `APP_BASE_URL`
- امکان deploy metadata/robots changes

### Work Packages
- Crawl/Index:
  - noindex برای مسیرهای tokenized و failed
- URLs/Duplicates/Canonicals:
  - canonical و hreflang کامل برای templateهای indexable
  - حذف fallback localhost در production
- Sitemaps/Robots:
  - `lastmod` واقعی به‌جای `new Date()` سراسری
- CWV/Performance:
  - پایش baseline با `src/scripts/lighthouse-local.ts`

### Implementation Notes
- helper مشترک base URL در `src/lib/seo.ts` تعریف شود.
- metadata rules به‌صورت reusable utility پیاده شود تا drift بین FA/EN کم شود.

### QA Checklist
- view-source صفحات indexable برای canonical/hreflang
- بررسی noindex روی token/success/failed
- validate خروجی `sitemap.xml`

### Acceptance Criteria
- هیچ URL از نوع localhost در canonical/sitemap/OG نباشد.
- token routes در index قرار نگیرند.
- sitemap فقط URLهای هدف ایندکس را پوشش دهد.

### Rollout / Risk Notes
- خطای robots/noindex می‌تواند over-block ایجاد کند؛ باید route-by-route verify شود.

---

## Phase 2 — Systemize On-Page SEO & IA
### Goal
یکپارچه‌سازی کیفیت on-page، schema و internal linking برای همه templateهای قابل ایندکس.

### Scope
- Included: metadata templates، schema templates، localization محتوا، IA linking
- Excluded: outreach و digital PR execution

### Entry Criteria
- Phase 1 acceptance کامل شده باشد.

### Work Packages
- On-Page Templates:
  - metadata کامل برای Audit/Sample/Pillar/Guides/Failed policies
- Schema:
  - `Article` + `BreadcrumbList` برای guide detail
- Internal Linking/IA:
  - breadcrumb، related guides، back-to-guides
  - recovery links برای failed pages
- Content Strategy:
  - تفکیک dataset راهنما برای `fa` و `en`
- CWV/Performance:
  - media standards (alt, dimensions, loading strategy)

### Implementation Notes
- محتوا در `src/content/guides.fa.ts` و `src/content/guides.en.ts` شکسته شود.
- template metadata در یک utility مرکزی normalize شود.

### QA Checklist
- uniqueness title/meta در کل صفحات indexable
- schema validation برای guide pages
- crawl داخلی و بررسی orphan کاهش‌یافته

### Acceptance Criteria
- تمام templateهای indexable metadata معتبر و غیرتکراری داشته باشند.
- guides فارسی واقعاً فارسی باشند.
- guide detailها breadcrumb و related links داشته باشند.

### Rollout / Risk Notes
- ریسک inconsistency ترجمه و پیام‌های mixed-language باید با QA محتوا کنترل شود.

---

## Phase 3 — Measurement, Content Ops, Authority
### Goal
تبدیل SEO از تغییرات موردی به چرخه پایدار رشد با اندازه‌گیری، content ops و authority framework.

### Scope
- Included: measurement taxonomy، dashboard KPI، content brief process، digital PR framework
- Excluded: تغییرات زیرساختی بزرگ در routing/architecture

### Entry Criteria
- Phase 1/2 پایدار و بدون regression باز

### Work Packages
- Measurement/Analytics:
  - event taxonomy برای funnel سئو
  - KPI dashboard (GSC + conversions)
- Content Strategy:
  - pillar/cluster governance + refresh policy
- Authority/Links:
  - تعریف linkable assets و outreach categories

### Implementation Notes
- event naming باید versioned و در docs ثبت شود.
- measurement وابسته به setup واقعی GA4/GSC production است.

### QA Checklist
- event firing QA برای مسیرهای اصلی
- sanity check نسبت click/impression/CTR در GSC
- کنترل کیفیت محتوای منتشرشده نسبت به brief

### Acceptance Criteria
- KPIهای SEO قابل اندازه‌گیری و قابل گزارش باشند.
- فرآیند content update و authority به‌صورت تکرارشونده مستند شده باشد.

### Rollout / Risk Notes
- بدون governance ممکن است تمرکز روی کمیت به کیفیت ضربه بزند؛ quality gate لازم است.

---

## Phase -> Task List

### Phase 1 Tasks
1. Title: Canonical & Base URL Hardening  
Location: `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/seo.ts`  
Problem: fallback localhost و پوشش ناقص canonical  
Proposed Fix: helper اجباری `APP_BASE_URL` + rollout metadata rules در templateها  
Dependencies/Risks: نیاز به env صحیح production  
Acceptance Criteria: canonical/sitemap/OG بدون localhost

2. Title: Noindex for Tokenized and Utility Pages  
Location: `src/app/audit/r/[token]/page.tsx`, `src/app/audit/r/[token]/unlock/page.tsx`, `src/app/audit/r/[token]/success/page.tsx`, `src/app/en/audit/r/[token]/**`, `src/app/failed/page.tsx`, `src/app/en/failed/page.tsx`  
Problem: index شدن صفحات tokenized/thin  
Proposed Fix: افزودن robots metadata (`noindex,nofollow`) + بازبینی robots rules  
Dependencies/Risks: over-blocking در صورت pattern اشتباه  
Acceptance Criteria: این صفحات در URL inspection با noindex دیده شوند

3. Title: Real Lastmod in Sitemap  
Location: `src/app/sitemap.ts`, `src/content/guides.ts`  
Problem: lastmod مصنوعی برای همه URLها  
Proposed Fix: اضافه‌کردن `updatedAt` به data source و inject در sitemap  
Dependencies/Risks: نیاز به فرآیند update واقعی محتوا  
Acceptance Criteria: lastmod متناسب با تغییرات واقعی

### Phase 2 Tasks
1. Title: Full Metadata Coverage Per Template  
Location: `src/app/audit/page.tsx`, `src/app/sample-report/page.tsx`, `src/app/pillar/iran-readiness-audit/page.tsx`, EN counterparts  
Problem: پوشش metadata ناقص  
Proposed Fix: metadata template استاندارد (title/meta/canonical/alternates/OG/Twitter)  
Dependencies/Risks: هماهنگی copy در دو زبان  
Acceptance Criteria: همه templateهای indexable metadata کامل و unique

2. Title: Schema for Guides  
Location: `src/app/guides/[slug]/page.tsx`, `src/app/en/guides/[slug]/page.tsx`  
Problem: نبود schema template-level برای مقاله/بردکرامب  
Proposed Fix: افزودن JSON-LD از نوع `Article` و `BreadcrumbList`  
Dependencies/Risks: نیاز به mapping درست داده‌ها  
Acceptance Criteria: validation بدون خطا برای schemaها

3. Title: FA/EN Content Split + IA Links  
Location: `src/content/guides.ts` (refactor), `src/app/guides/[slug]/page.tsx`, `src/app/en/guides/[slug]/page.tsx`  
Problem: mixed-language content و linking داخلی ضعیف  
Proposed Fix: جداسازی `guides.fa/en` + breadcrumb + related links + back links  
Dependencies/Risks: QA ترجمه و consistency  
Acceptance Criteria: فارسی/انگلیسی مستقل + بهبود link graph

### Phase 3 Tasks
1. Title: SEO Event Taxonomy & KPI Dashboard  
Location: `docs/` (measurement spec), key UI routes (`src/app/page.tsx`, `src/app/audit/page.tsx`, `src/app/guides/**`)  
Problem: نبود measurement عملیاتی SEO-to-conversion  
Proposed Fix: تعریف event taxonomy + KPI dashboard model (GSC/GA4)  
Dependencies/Risks: setup production analytics  
Acceptance Criteria: event map مستند و قابل QA

2. Title: Content Ops & Authority Framework  
Location: `docs/` (new process docs)  
Problem: نبود فرآیند پایدار برای رشد محتوایی و authority  
Proposed Fix: brief template، refresh policy، linkable assets framework  
Dependencies/Risks: نیاز به ownership مشخص تیمی  
Acceptance Criteria: فرآیند مستند و قابل تکرار برای هر انتشار
