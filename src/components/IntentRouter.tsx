"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trackSeoEvent } from "../lib/analytics";
import { buildAuditCtaHref } from "../lib/audit-cta-registry";
import {
  INTENT_ROUTER_CTA_MAP,
  trackIntentRouterCtaClick,
  type IntentRouterRouteKey,
} from "../lib/intent-router-cta";

type Locale = "fa" | "en";
type RouterVariant = "audit_first" | "execution_first";

type RouteItem = {
  key: IntentRouterRouteKey;
  title: string;
  description: string;
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
    const fa: Record<IntentRouterRouteKey, RouteItem> = {
      audit: {
        key: "audit",
        title: "می‌خواهم سریع وضعیت فنی سایت را بدانم",
        description: "برای بررسی خودکار و مشاهده یافته‌های قابل‌اندازه‌گیری، ارزیابی را همین‌جا شروع کنید.",
      },
      execution: {
        key: "execution",
        title: "برای اصلاح و اجرا به تیم فنی نیاز دارم",
        description: "اگر برای اجرای اصلاحات به همکاری مهندسی نیاز دارید، وارد مسیر درخواست اجرای ASDEV شوید. این مسیر جدا از ارزیابی خودکار است.",
      },
      toolbox: {
        key: "toolbox",
        title: "فعلاً ابزارهای سریع و رایگان می‌خواهم",
        description: "برای کارهای روزمره مثل PDF، متن و تصویر از PersianToolbox استفاده کنید.",
      },
    };

    const en: Record<IntentRouterRouteKey, RouteItem> = {
      audit: {
        key: "audit",
        title: "I need immediate technical visibility",
        description: "Start the automated audit here to review measurable findings and coverage.",
      },
      execution: {
        key: "execution",
        title: "I need implementation support",
        description: "Use the separate ASDEV implementation enquiry when you need engineering help to carry out fixes; it is not an automated-audit certification path.",
      },
      toolbox: {
        key: "toolbox",
        title: "I need practical utilities first",
        description: "Use local-first Persian tools for daily PDF, text, and image tasks.",
      },
    };

    const source = locale === "fa" ? fa : en;
    const order: IntentRouterRouteKey[] = variant === "execution_first"
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

  const primaryKey: IntentRouterRouteKey = variant === "execution_first" ? "execution" : "audit";

  return (
    <section id="intent-router" className="intent-router">
      <div className="section-head">
        <h2>{copy.heading}</h2>
        <p>{copy.subtitle}</p>
      </div>
      <div className="intent-grid">
        {routes.map((item) => {
          const isPrimary = item.key === primaryKey;
          const cta = INTENT_ROUTER_CTA_MAP[item.key];
          const href = buildAuditCtaHref(cta, locale);
          const external = cta.external === true;
          return (
            <article className="intent-card" key={item.key}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link
                className={`button ${isPrimary ? "" : "secondary"}`.trim()}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                onClick={() => {
                  trackIntentRouterCtaClick(item.key, locale, variant);
                  trackSeoEvent("seo_intent_router_click", {
                    locale,
                    variant,
                    route: item.key,
                    destination: external ? "external" : "internal",
                  });
                }}
              >
                {cta.label[locale]}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
