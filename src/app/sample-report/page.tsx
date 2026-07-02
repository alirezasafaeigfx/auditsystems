import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/sample-report",
  title: "گزارش نمونه ارزیابی فنی سایت",
  description: "نمونه واقعی گزارش ارزیابی فنی سایت شامل مشکلات امنیتی، سئو، عملکرد و دسترسی‌پذیری با پیشنهادات اصلاحی.",
  keywords: ["گزارش نمونه", "audit report sample", "ارزیابی فنی سایت", "سئو", "امنیت"]
});

type SampleFinding = {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  effort: string;
};

const sampleFindings: SampleFinding[] = [
  {
    code: "NO_CSP_HEADER",
    severity: "CRITICAL",
    category: "امنیت",
    title: "هدر Content-Security-Policy موجود نیست",
    description: "سایت شما هدر CSP را ارسال نمی‌کند. این امر سایت را در برابر حملات XSS آسیب‌پذیر می‌کند.",
    recommendation: "هدر Content-Security-Policy را با سیاست‌های مناسب پیاده‌سازی کنید. با حالت گزارش شروع کنید و سپس به حالت اجرا تغییر دهید.",
    impact: "بالا",
    effort: "متوسط",
  },
  {
    code: "NO_HSTS",
    severity: "HIGH",
    category: "امنیت",
    title: "هدر HSTS موجود نیست",
    description: "هدر HTTP Strict-Transport-Security تنظیم نشده است. مرورگر کاربر ممکن است اتصال HTTPS را مجبور نکند.",
    recommendation: "هدر Strict-Transport-Safety را با مقدار max-age مناسب (حداقل یک سال) اضافه کنید.",
    impact: "بالا",
    effort: "کم",
  },
  {
    code: "THIRD_PARTY_FONTS",
    severity: "MEDIUM",
    category: "انعطاف‌پذیری",
    title: "۳ فونت از سرورهای شخص ثالث بارگذاری می‌شود",
    description: "فونت‌های Google Fonts از CDN خارجی بارگذاری می‌شوند. در صورت مسدود شدن CDN، فونت‌ها نمایش داده نمی‌شوند.",
    recommendation: "فونت‌ها را به صورت محلی میزبانی کنید یا از z fallback استفاده کنید تا در صورت عدم بارگذاری، فونت جایگزین نمایش داده شود.",
    impact: "متوسط",
    effort: "متوسط",
  },
  {
    code: "CWV_LCP_POOR_PROXY",
    severity: "HIGH",
    category: "عملکرد",
    title: "LCP بالا: بیش از ۴ ثانیه",
    description: "بزرگترین عنصر نقاشی (LCP) بیش از ۴ ثانیه طول می‌کشد تا بارگذاری شود. این بر تجربه کاربری و رتبه سئو تأثیر منفی دارد.",
    recommendation: "تصاویر above-the-fold را بهینه کنید، preload برای LCP اضافه کنید و بارگذاری تنبل را برای تصاویر غیرضروری فعال کنید.",
    impact: "بالا",
    effort: "متوسط",
  },
  {
    code: "HIGH_CLS",
    severity: "HIGH",
    category: "عملکرد",
    title: "CLS بالا: جابجایی عناصر در حین بارگذاری",
    description: "نرخ جابجایی تجمعی (CLS) بالاتر از حد مجاز است. عناصر صفحه در حین بارگذاری جابجا می‌شوند و تجربه کاربری را خراب می‌کنند.",
    recommendation: "ابعاد تصاویر و ویدیوها را از قبل مشخص کنید، فونت‌های web را preload کنید و محتوای داینامیک را در containter ثابت قرار دهید.",
    impact: "بالا",
    effort: "متوسط",
  },
  {
    code: "NO_CANONICAL",
    severity: "HIGH",
    category: "سئو",
    title: "URL canonical تنظیم نشده است",
    description: "صفحات شما فاقد تگ canonical هستند. موتورهای جستجو ممکن است نسخه‌های تکراری صفحه را ایندکس کنند.",
    recommendation: "تگ canonical در head هر صفحه اضافه کنید تا نسخه ترجیحی URL مشخص شود.",
    impact: "بالا",
    effort: "کم",
  },
  {
    code: "NO_OG_TAGS",
    severity: "MEDIUM",
    category: "سئو",
    title: "تگ‌های Open Graph موجود نیست",
    description: "تگ‌های Open Graph برای نمایش صحیح صفحات در شبکه‌های اجتماعی تنظیم نشده‌اند.",
    recommendation: "تگ‌های og:title، og:description، og:image و og:url را به هر صفحه اضافه کنید.",
    impact: "متوسط",
    effort: "کم",
  },
  {
    code: "NO_STRUCTURED_DATA",
    severity: "LOW",
    category: "سئو",
    title: "داده‌های ساختاریافته (Schema.org) موجود نیست",
    description: "سایت شما فاقد داده‌های ساختاریافته است. این باعث می‌شود نتایج غنی (Rich Snippets) در موتورهای جستجو نمایش داده نشوند.",
    recommendation: "داده‌های ساختاریافته JSON-LD مانند WebSite، Organization یا FAQPage اضافه کنید.",
    impact: "کم",
    effort: "کم",
  },
  {
    code: "IMG_MISSING_ALT",
    severity: "MEDIUM",
    category: "دسترسی‌پذیری",
    title: "۷ تصویر بدون متن جایگزین (alt) هستند",
    description: "تصاویر بدون متن alt برای کاربران صفحه‌خوان غیرقابل دسترسی هستند و بر نمره دسترسی‌پذیری تأثیر می‌گذارند.",
    recommendation: "برای تمام تصاویر معنادار متن alt توصیفی اضافه کنید. برای تصاویر تزئینی از alt خالی استفاده کنید.",
    impact: "متوسط",
    effort: "کم",
  },
  {
    code: "MIXED_CONTENT",
    severity: "MEDIUM",
    category: "امنیت",
    title: "محتوای ترکیبی (HTTP روی HTTPS) شناسایی شد",
    description: "برخی منابع (تصاویر، اسکریپت‌ها) از طریق HTTP بارگذاری می‌شوند در حالی که صفحه HTTPS است.",
    recommendation: "تمام منابع را به HTTPS ارتقا دهید و از protocol-relative URLs استفاده کنید.",
    impact: "متوسط",
    effort: "کم",
  },
  {
    code: "STATIC_ASSETS_NO_LONG_CACHE",
    severity: "LOW",
    category: "عملکرد",
    title: "فایل‌های استاتیک کش بلندمدت ندارند",
    description: "فایل‌های CSS و JS با هدر cache کوتاه ارسال می‌شوند. این باعث بارگذاری مجدد فایل‌ها در هر درخواست می‌شود.",
    recommendation: "برای فایل‌های استاتیک با هش نسخه، هدر cache-max-age با مقدار بالا (حداقل یک سال) تنظیم کنید.",
    impact: "کم",
    effort: "کم",
  },
  {
    code: "MOBILE_VIEWPORT_ISSUE",
    severity: "MEDIUM",
    category: "دسترسی‌پذیری",
    title: "مشکل نمایش در موبایل شناسایی شد",
    description: "اندازه برخی عناصر تعاملی در نسخه موبایل کوچکتر از حداقل اندازه توصیه شده (44x44 پیکسل) است.",
    recommendation: "اندازه دکمه‌ها و لینک‌های تعاملی را حداقل 44x44 پیکسل تنظیم کنید تا لمس آسان‌تر شود.",
    impact: "متوسط",
    effort: "کم",
  },
];

const overallScore = 58;
const scoreGrade = "D";

function severityBadge(severity: string): string {
  if (severity === "CRITICAL") return "sev-critical";
  if (severity === "HIGH") return "sev-high";
  if (severity === "MEDIUM") return "sev-medium";
  return "";
}

const securityHeaders = [
  { name: "Content-Security-Policy", status: "missing" as const },
  { name: "Strict-Transport-Security", status: "missing" as const },
  { name: "X-Content-Type-Options", status: "present" as const },
  { name: "Referrer-Policy", status: "present" as const },
  { name: "Permissions-Policy", status: "missing" as const },
];

const seoBasics = [
  { name: "عنوان صفحه (title)", status: "present" as const },
  { name: "توضیحات متا", status: "present" as const },
  { name: "URL canonical", status: "missing" as const },
  { name: "Open Graph", status: "missing" as const },
];

export default function SampleReportPage() {
  return (
    <main>
      <section className="card hero">
        <h1>گزارش نمونه ارزیابی فنی</h1>
        <p>
          این یک نمونه واقعی از گزارش ارزیابی فنی سایت است. گزارش شامل یافته‌های امنیتی، عملکرد،
          سئو و دسترسی‌پذیری با پیشنهادات اصلاحی است.
        </p>
        <div className="hero-actions">
          <span className="badge">نمونه - anonymous-example.ir</span>
          <Link className="button secondary" href="/audit">
            شروع ارزیابی سایت خودتان
          </Link>
        </div>
      </section>

      <section className="card grid">
        <h2>خلاصه ارزیابی</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.8rem" }}>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>امتیاز کل</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--danger)" }}>{overallScore}<span style={{ fontSize: "1rem" }}>/100</span></div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--danger)" }}>رده: {scoreGrade}</div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>تعداد یافته‌ها</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{sampleFindings.length}</div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>بحرانی</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
              {sampleFindings.filter(f => f.severity === "CRITICAL").length}
            </div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>بالا</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
              {sampleFindings.filter(f => f.severity === "HIGH").length}
            </div>
          </div>
          <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>متوسط</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warn)" }}>
              {sampleFindings.filter(f => f.severity === "MEDIUM").length}
            </div>
          </div>
        </div>
      </section>

      <section className="card grid">
        <h2>هدرهای امنیتی</h2>
        <div className="grid" style={{ gap: "0.5rem" }}>
          {securityHeaders.map((header) => (
            <div key={header.name} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span style={{ fontWeight: 600 }}>{header.name}</span>
              <span className={`badge ${header.status === "missing" ? "sev-high" : ""}`}>
                {header.status === "present" ? "موجود" : "موجود نیست"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid">
        <h2>وضعیت سئو</h2>
        <div className="grid" style={{ gap: "0.5rem" }}>
          {seoBasics.map((item) => (
            <div key={item.name} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
              <span className={`badge ${item.status === "missing" ? "sev-medium" : ""}`}>
                {item.status === "present" ? "موجود" : "موجود نیست"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid">
        <h2>یافته‌ها ({sampleFindings.length})</h2>
        {sampleFindings.map((finding) => (
          <article key={finding.code} className="finding">
            <div className="finding-header">
              <strong>{finding.code}</strong>
              <span className={`badge ${severityBadge(finding.severity)}`}><span className="sr-only">شدت: </span>{finding.severity}</span>
            </div>
            <h3 style={{ fontWeight: 600, fontSize: "1rem" }}>{finding.title}</h3>
            <p>{finding.description}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              تأثیر: {finding.impact} | تلاش اصلاح: {finding.effort}
            </p>
            <p style={{ borderTop: "1px dashed var(--line)", paddingTop: "0.5rem", marginTop: "0.3rem" }}>
              پیشنهاد: {finding.recommendation}
            </p>
          </article>
        ))}
      </section>

      <section className="card hero">
        <h2>سایت خود را همین الان بررسی کنید</h2>
        <p>
          گزارش کامل ارزیابی فنی سایت شما در کمتر از ۶۰ ثانیه آماده می‌شود. بدون ثبت‌نام، بدون
          پرداخت، بدون نصب نرم‌افزار.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/audit">
            شروع ارزیابی رایگان
          </Link>
          <Link className="button secondary" href="/en/audit">
            Start Free Audit (English)
          </Link>
        </div>
      </section>
    </main>
  );
}
