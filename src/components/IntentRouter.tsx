"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trackSeoEvent } from "../lib/analytics";
import { trackIntentRouterCtaClick } from "../lib/intent-router-cta";

type Locale = "fa" | "en";
type IntentKey = "audit" | "execution" | "toolbox";
type RouterVariant = "audit_first" | "execution_first";

type RouteItem = {
  key: IntentKey;
  title: string;
  description: string;
  href: string;
  external: boolean;
  cta: string;
};

function pickVariant(seed: string): RouterVariant {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100 < 50 ? "audit_first" : "execution_first";
}

export default function IntentRouter({ locale }: { locale: Locale }) {
  const [variant, setVariant] = useState<RouterVariant>("audit_first");
  const [variantReady, setVariantReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const key = `audit_intent_variant_${locale}`;
    const saved = window.localStorage.getItem(key);
    const assigned = saved === "audit_first" || saved === "execution_first"
      ? saved
      : pickVariant(`${navigator.userAgent}_${locale}`);
    window.localStorage.setItem(key, assigned);
    setVariant(assigned);
    setVariantReady(true);
  }, [locale]);

  const copy = locale === "fa"
    ? {
        heading: "الان بهترین مسیر برای شما کدام است؟",
        subtitle: "بر اساس نیازتان یکی از این ۳ مسیر را انتخاب کنید تا سریع‌تر به نتیجه برسید.",
      }
    : {
        heading: "Which path fits your current need?",
        subtitle: "Pick one route and move directly to the right output.",
      };

  const routes = useMemo<RouteItem[]>(() => {
    const fa: Record<IntentKey, RouteItem> = {
      audit: {
        key: "audit",
        title: "می‌خواهم سریع وضعیت فنی سایت را بدانم",
        description: "اگر گزارش فنی قابل‌اجرا می‌خواهید، همین‌جا ارزیابی جدید را شروع کنید.",
        href: "/audit",
        external: false,
        cta: "شروع ارزیابی",
      },
      execution: {
        key: "execution",
        title: "برای اصلاح و اجرا به تیم فنی نیاز دارم",
        description: "اگر بعد از گزارش نیاز به اجرا دارید، مستقیم وارد مسیر همکاری با علیرضا صفایی شوید. یا اسکوپ یک‌صفحه‌ای بررسی فنی + Quick Fix را دانلود کنید.",
        href: "https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=alireza_safaei_network&utm_content=execution_route",
        external: true,
        cta: "ورود به سایت Alireza Safaei",
      },
      toolbox: {
        key: "toolbox",
        title: "فعلاً ابزارهای سریع و رایگان می‌خواهم",
        description: "برای کارهای روزمره مثل PDF، متن و تصویر از PersianToolbox استفاده کنید.",
        href: "https://persiantoolbox.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=alireza_safaei_network&utm_content=toolbox_route",
        external: true,
        cta: "ورود به PersianToolbox",
      },
    };

    const en: Record<IntentKey, RouteItem> = {
      audit: {
        key: "audit",
        title: "I need immediate technical visibility",
        description: "Start an audit now and get prioritized findings with actionable guidance.",
        href: "/en/audit",
        external: false,
        cta: "Start Audit",
      },
      execution: {
        key: "execution",
        title: "I need implementation support",
        description: "Move from diagnosis to execution with direct engineering collaboration. Or download the one-page Audit + Quick Fix scope.",
        href: "https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=alireza_safaei_network&utm_content=execution_route_en",
        external: true,
        cta: "Open Alireza Safaei Systems",
      },
      toolbox: {
        key: "toolbox",
        title: "I need practical utilities first",
        description: "Use local-first Persian tools for daily PDF, text, and image tasks.",
        href: "https://persiantoolbox.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=alireza_safaei_network&utm_content=toolbox_route_en",
        external: true,
        cta: "Open PersianToolbox",
      },
    };

    const source = locale === "fa" ? fa : en;
    const order: IntentKey[] = variant === "execution_first"
      ? ["execution", "audit", "toolbox"]
      : ["audit", "execution", "toolbox"];

    return order.map((key) => source[key]);
  }, [locale, variant]);

  useEffect(() => {
    if (!variantReady) return;
    trackSeoEvent("seo_intent_router_view", {
      locale,
      variant,
      section: "home_intent_router",
    });
  }, [locale, variant, variantReady]);

  const primaryKey: IntentKey = variant === "execution_first" ? "execution" : "audit";

  return (
    <section id="intent-router" className="intent-router">
      <div className="section-head">
        <h2>{copy.heading}</h2>
        <p>{copy.subtitle}</p>
      </div>
      <div className="intent-grid">
        {routes.map((item) => {
          const isPrimary = item.key === primaryKey;
          return (
            <article className="intent-card" key={item.key}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link
                className={`button ${isPrimary ? "" : "secondary"}`.trim()}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => {
                  trackIntentRouterCtaClick(item.key, locale, variant);
                  trackSeoEvent("seo_intent_router_click", {
                    locale,
                    variant,
                    route: item.key,
                    destination: item.external ? "external" : "internal",
                  });
                }}
              >
                {item.cta}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
