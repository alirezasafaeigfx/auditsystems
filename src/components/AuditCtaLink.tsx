"use client";

import Link from "next/link";
import { trackSeoEvent } from "../lib/analytics";
import {
  buildAuditCtaHref,
  getAuditCta,
  type AuditCtaEntry,
} from "../lib/audit-cta-registry";
import type { SampleLocale } from "../lib/sample-report/types";

type AuditCtaLinkProps = {
  ctaId: string;
  locale?: SampleLocale;
  className?: string;
  prefillUrl?: string;
};

function buttonClass(entry: AuditCtaEntry): string {
  return entry.variant === "primary" ? "button" : "button secondary";
}

export default function AuditCtaLink({
  ctaId,
  locale = "fa",
  className,
  prefillUrl,
}: AuditCtaLinkProps) {
  const entry = getAuditCta(ctaId);
  if (!entry) {
    return null;
  }

  const resolved = entry;
  const href = buildAuditCtaHref(resolved, locale, { prefillUrl });
  const label = resolved.label[locale];
  const classes = className ?? buttonClass(resolved);

  function onClick() {
    trackSeoEvent("seo_cta_click", {
      cta_id: resolved.id,
      intent: resolved.intent,
      surface: resolved.surface,
      locale,
    });
  }

  if (entry.external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {label}
    </Link>
  );
}