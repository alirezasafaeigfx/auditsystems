// 01-audit/src/lib/rules.ts
import type { AuditContext, Finding } from "./types";

function hasHeader(headers: Record<string, string>, name: string) {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function includesAny(u: string, needles: string[]) {
  const x = u.toLowerCase();
  return needles.some((n) => x.includes(n));
}

function isHttpUrl(u: string) {
  return /^http:\/\//i.test(u);
}

export function evaluateAuditRules(ctx: AuditContext): Finding[] {
  const findings: Finding[] = [];

  // 1) THIRD_PARTY_FONTS
  const fontUrls = ctx.resources
    .filter((r) => r.isThirdParty && (r.kind === "font" || r.kind === "style"))
    .map((r) => r.url)
    .filter((u) => includesAny(u, ["fonts.googleapis", "fonts.gstatic", ".woff", ".woff2"]));

  if (fontUrls.length) {
    findings.push({
      code: "THIRD_PARTY_FONTS",
      category: "RESILIENCE",
      severity: "HIGH",
      title: "فونت‌های خارجی (Third‑party) در صفحه شناسایی شد",
      recommendation: "فونت‌ها را self-host کنید، preload بگذارید و fallback فونت تعریف کنید.",
      evidence: { count: fontUrls.length, examples: fontUrls.slice(0, 10) },
    });
  }

  // 2) THIRD_PARTY_CRITICAL_JS
  const criticalThirdPartyScripts = ctx.resources.filter(
    (r) =>
      r.kind === "script" &&
      r.isThirdParty &&
      r.inHead &&
      !String(r.attrs?.defer ?? "").length &&
      !String(r.attrs?.async ?? "").length
  );

  if (criticalThirdPartyScripts.length) {
    findings.push({
      code: "THIRD_PARTY_CRITICAL_JS",
      category: "RESILIENCE",
      severity: "HIGH",
      title: "اسکریپت‌های third‑party به صورت blocking در head لود می‌شوند",
      recommendation: "اسکریپت‌ها را defer/async کنید، تعداد را کاهش دهید یا self-host کنید.",
      evidence: {
        count: criticalThirdPartyScripts.length,
        examples: criticalThirdPartyScripts.slice(0, 10).map((x) => x.url),
      },
    });
  }

  // 3) RECAPTCHA_DEPENDENCY
  const recaptcha = ctx.resources.filter((r) =>
    includesAny(r.url, ["recaptcha", "google.com/recaptcha", "gstatic.com/recaptcha"])
  );

  if (recaptcha.length) {
    findings.push({
      code: "RECAPTCHA_DEPENDENCY",
      category: "RESILIENCE",
      severity: "HIGH",
      title: "وابستگی به reCAPTCHA/Google anti-bot شناسایی شد",
      recommendation: "Fallback UX و rate limit سمت سرور داشته باشید یا از گزینه‌های جایگزین استفاده کنید.",
      evidence: { count: recaptcha.length, examples: recaptcha.slice(0, 10).map((x) => x.url) },
    });
  }

  // 4) MIXED_CONTENT
  if (ctx.target.protocol === "https:") {
    const mixed = ctx.resources.filter((r) => isHttpUrl(r.url));
    if (mixed.length) {
      findings.push({
        code: "MIXED_CONTENT",
        category: "SECURITY",
        severity: "HIGH",
        title: "Mixed Content: منابع HTTP روی سایت HTTPS",
        recommendation: "همه منابع را HTTPS کنید و CSP: upgrade-insecure-requests را بررسی کنید.",
        evidence: { count: mixed.length, examples: mixed.slice(0, 10).map((x) => x.url) },
      });
    }
  }

  // 5) NO_CSP_HEADER
  const csp = hasHeader(ctx.main.headers, "content-security-policy");
  if (!csp) {
    findings.push({
      code: "NO_CSP_HEADER",
      category: "SECURITY",
      severity: "MEDIUM",
      title: "هدر Content-Security-Policy تنظیم نشده است",
      recommendation: "یک CSP حداقلی اضافه کنید و مرحله‌ای سخت‌ترش کنید.",
      evidence: { header: null },
    });
  }

  // 6) NO_HSTS
  const hsts = hasHeader(ctx.main.headers, "strict-transport-security");
  if (ctx.target.protocol === "https:" && !hsts) {
    findings.push({
      code: "NO_HSTS",
      category: "SECURITY",
      severity: "MEDIUM",
      title: "HSTS فعال نیست",
      recommendation: "Strict-Transport-Security را با max-age مناسب فعال کنید (با احتیاط).",
      evidence: { header: null },
    });
  }

  // 7) STATIC_ASSETS_NO_LONG_CACHE (MVP: فقط هشدار، برای دقیق‌تر شدن باید HEAD چند asset را بزنید)
  // This archived blueprint leaves sampled asset-header collection to the runtime handler.
  // اینجا فقط placeholder می‌گذاریم تا بعداً کامل شود.
  // findings.push({ ... })

  // 8-9) Performance heavy rules (بهتر است با Lighthouse پر شود)
  // 10) SEO basics (با parse HTML title/meta/canonical/og)

  return findings;
}
