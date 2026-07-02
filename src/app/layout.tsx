import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import Script from "next/script";
import { getAppBaseUrl } from "../lib/site";
import {
  ASDEV_TELEGRAM_URL,
} from "../lib/brand";
import RumTracker from "../components/RumTracker";
import ThemeProvider from "../components/ThemeProvider";
import ThemeToggle from "../components/ThemeToggle";

const appBaseUrl = getAppBaseUrl();
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
  title: {
    default: "سیستم ممیزی علیرضا صفایی | ارزیابی فنی، سئو و امنیت",
    template: "%s | سیستم ممیزی علیرضا صفایی"
  },
  description: "پلتفرم حرفه ای ارزیابی سایت برای تحلیل فنی، سئو، امنیت و بهینه سازی رشد با خروجی عملیاتی و قابل اجرا.",
  keywords: [
    "ممیزی سایت",
    "ممیزی فنی",
    "ممیزی سئو",
    "ممیزی امنیت",
    "بهینه سازی سرعت سایت",
    "Core Web Vitals",
    "technical seo audit",
    "website performance audit"
  ],
  authors: [{ name: "Alireza Safaei", url: "https://alirezasafaeisystems.ir/" }],
  creator: "Alireza Safaei",
  publisher: "Alireza Safaei",
  alternates: {
    canonical: "/",
    languages: {
      "fa-IR": "/",
      "en-US": "/en",
      "x-default": "/"
    }
  },
  openGraph: {
    type: "website",
    url: appBaseUrl,
    title: "سیستم ممیزی علیرضا صفایی",
    description: "ممیزی فنی، سئو و امنیت با خروجی قابل اجرا برای تیم محصول و فنی.",
    siteName: "سیستم ممیزی علیرضا صفایی",
    locale: "fa_IR",
    alternateLocale: ["en_US"]
  },
  twitter: {
    card: "summary_large_image",
    title: "سیستم ممیزی علیرضا صفایی",
    description: "ارزیابی فنی، سئو و امنیت سایت با خروجی عملیاتی."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {})
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f7a66",
  colorScheme: "light dark"
};

type LayoutCopy = {
  brand: string;
  nav: { audit: string; guides: string; sample: string; pillar: string; pricing: string };
  skipToContent: string;
  footer: {
    aboutTitle: string;
    aboutText: string;
    location: string;
    quickTitle: string;
    standardsTitle: string;
    creatorTitle: string;
    portfolioTitle: string;
    toolboxTitle: string;
    personalSiteTitle: string;
    repoTitle: string;
    contactTitle: string;
    contactText: string;
    messageCta: string;
    rights: string;
    builtBy: string;
    langSwitch: string;
  };
};

const faCopy: LayoutCopy = {
  brand: "Audit Systems",
  nav: { audit: "شروع ارزیابی", guides: "راهنماهای کاربردی", sample: "نمونه گزارش", pillar: "چارچوب ارزیابی", pricing: "قیمت‌گذاری" },
  skipToContent: "رفتن به محتوای اصلی",
  footer: {
    aboutTitle: "Audit Systems",
    aboutText: "سایت شما را از نظر فنی، سئو و امنیت ارزیابی می‌کنیم و خروجی قابل‌اجرا برای تیم فنی و رشد تحویل می‌دهیم.",
    location: "تهران — همکاری حضوری و ریموت در سراسر ایران",
    quickTitle: "دسترسی سریع",
    standardsTitle: "استاندارد تحویل",
    creatorTitle: "شبکه علیرضا صفایی",
    portfolioTitle: "پورتفولیو و راه‌های ارتباطی",
    toolboxTitle: "PersianToolbox",
    personalSiteTitle: "سایت اصلی علیرضا صفایی",
    repoTitle: "کد پروژه در GitHub",
    contactTitle: "شروع همکاری",
    contactText: "برای ارزیابی زیرساخت، بهبود فنی سایت یا اجرای برنامه رشد، همین حالا پیام بدهید.",
    messageCta: "ارسال پیام",
    rights: "تمام حقوق محفوظ است.",
    builtBy: "طراحی و اجرا:",
    langSwitch: "English"
  }
};

const enCopy: LayoutCopy = {
  brand: "Alireza Safaei Audit",
  nav: { audit: "Start Audit", guides: "Guides", sample: "Sample Report", pillar: "Pillar", pricing: "Pricing" },
  skipToContent: "Skip to main content",
  footer: {
    aboutTitle: "Alireza Safaei",
    aboutText: "Audit platform for technical SEO, security, and conversion-focused delivery across Alireza Safaei products.",
    location: "Tehran — Remote and on-site collaboration",
    quickTitle: "Quick Links",
    standardsTitle: "Delivery Standards",
    creatorTitle: "Network",
    portfolioTitle: "Portfolio & contact page",
    toolboxTitle: "PersianToolbox",
    personalSiteTitle: "Personal site",
    repoTitle: "Project GitHub repository",
    contactTitle: "Contact",
    contactText: "For production rollout and infrastructure consulting, get in touch.",
    messageCta: "Send Message",
    rights: "All rights reserved. Alireza Safaei Audit Platform",
    builtBy: "Built by",
    langSwitch: "فارسی"
  }
};

function withLocalePath(path: string, locale: "fa" | "en"): string {
  if (locale === "fa") return path;
  if (path === "/") return "/en";
  return `/en${path}`;
}

function toOtherLocalePath(pathname: string, locale: "fa" | "en"): string {
  if (locale === "fa") {
    if (pathname === "/") return "/en";
    return `/en${pathname}`;
  }
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return "/";
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const locale = h.get("x-asdev-locale") === "en" ? "en" : "fa";
  const pathname = h.get("x-asdev-pathname") ?? "/";
  const copy = locale === "en" ? enCopy : faCopy;
  const currentYear = new Date().getFullYear();
  const gaMeasurementId = String(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "").trim();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Alireza Safaei Audit Platform",
        url: appBaseUrl,
        sameAs: [
          "https://alirezasafaeisystems.ir",
          "https://persiantoolbox.ir"
        ]
      },
      {
        "@type": "WebSite",
        name: "Alireza Safaei Audit Platform",
        url: appBaseUrl,
        inLanguage: locale === "en" ? "en-US" : "fa-IR",
        isPartOf: {
          "@type": "Organization",
          name: "Alireza Safaei"
        }
      },
      {
        "@type": "SoftwareApplication",
        name: "Alireza Safaei Audit Platform",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD"
        }
      },
      {
        "@type": "WebSite",
        name: "Alireza Safaei Systems",
        url: "https://alirezasafaeisystems.ir"
      },
      {
        "@type": "WebSite",
        name: "PersianToolbox",
        url: "https://persiantoolbox.ir"
      }
    ]
  };
  return (
    <html lang={locale === "en" ? "en" : "fa"} dir={locale === "en" ? "ltr" : "rtl"}>
      <head>
        <link rel="preload" href="/fonts/Vazirmatn-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/IRANSansX-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/IRANSansX-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script
          id="root-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd)
          }}
        />
        {gaMeasurementId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
            <Script
              id="ga4-bootstrap"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('js', new Date());
                  gtag('consent', 'default', { analytics_storage: 'denied' });
                  gtag('config', '${gaMeasurementId}', { anonymize_ip: true, send_page_view: false });
                `
              }}
            />
          </>
        ) : null}
      </head>
      <body>
        <ThemeProvider>
          <a href="#main-content" className="skip-link">
            {copy.skipToContent}
          </a>
          <header className="topbar">
            <div className="container topbar-inner">
              <Link href={withLocalePath("/", locale)} className="brand">
                <span className="brand-title">{copy.brand}</span>
                <span className="brand-subtitle">{locale === "en" ? "Technical SEO + Security" : "ارزیابی فنی، سئو و امنیت"}</span>
              </Link>
              <nav className="nav">
                <Link href={withLocalePath("/audit", locale)}>{copy.nav.audit}</Link>
                <Link href={withLocalePath("/pricing", locale)}>{copy.nav.pricing}</Link>
                <Link href={withLocalePath("/guides", locale)}>{copy.nav.guides}</Link>
                <Link href={withLocalePath("/sample-report", locale)}>{copy.nav.sample}</Link>
                <Link href={withLocalePath("/pillar/iran-readiness-audit", locale)}>{copy.nav.pillar}</Link>
                <ThemeToggle />
                <Link className="lang-switch" href={toOtherLocalePath(pathname, locale)}>
                  {copy.footer.langSwitch}
                </Link>
              </nav>
            </div>
          </header>
        <div className="container page-shell">
          <div id="main-content" role="main" className="main-content">
            {children}
          </div>
        </div>
        <footer className="footer">
          <div className="container footer-content">
            <section className="footer-grid footer-grid-enhanced">
              <article className="footer-col footer-col-brand">
                <h2>{copy.footer.aboutTitle}</h2>
                <p className="footer-lead">{copy.footer.aboutText}</p>
                <p>{copy.footer.location}</p>
              </article>

              <nav className="footer-col" aria-label={copy.footer.quickTitle}>
                <h3>{copy.footer.quickTitle}</h3>
                <ul>
                  <li>
                    <Link href={withLocalePath("/", locale)}>{locale === "en" ? "Home" : "خانه"}</Link>
                  </li>
                  <li>
                    <Link href={withLocalePath("/audit", locale)}>{copy.nav.audit}</Link>
                  </li>
                  <li>
                    <Link href={withLocalePath("/pricing", locale)}>{copy.nav.pricing}</Link>
                  </li>
                  <li>
                    <Link href={withLocalePath("/guides", locale)}>{copy.nav.guides}</Link>
                  </li>
                  <li>
                    <Link href={withLocalePath("/sample-report", locale)}>{copy.nav.sample}</Link>
                  </li>
                  <li>
                    <Link href={withLocalePath("/standards", locale)}>{copy.footer.standardsTitle}</Link>
                  </li>
                </ul>
              </nav>

              <section className="footer-col footer-contact">
                <h3>{copy.footer.contactTitle}</h3>
                <p>{copy.footer.contactText}</p>
                <div className="footer-actions">
                  <a className="button" href="mailto:team@alirezasafaeisystems.ir">
                    {copy.footer.messageCta}
                  </a>
                  <Link className="button secondary" href={ASDEV_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                    {locale === "en" ? "Telegram" : "تلگرام"}
                  </Link>
                </div>
              </section>
            </section>

            <div className="mt-8 pt-5 border-t text-xs text-muted-foreground flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span>© {currentYear} {locale === "en" ? "Alireza Safaei Audit Platform. All rights reserved." : "سیستم ممیزی. همه حقوق محفوظ است."}</span>
              <span>
                {locale === "en" ? "Built by " : "طراحی و توسعه توسط "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-primary"
                  href="https://alirezasafaeisystems.ir/"
                >
                  {locale === "en" ? "Alireza Safaei" : "علیرضا صفایی مهندس سیستم های وب"}
                </a>
              </span>
            </div>
          </div>
        </footer>
        <RumTracker locale={locale} />
        </ThemeProvider>
      </body>
    </html>
  );
}
