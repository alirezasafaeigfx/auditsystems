"use client";

import { FormEvent, useState } from "react";

export type HeroAuditLocale = "fa" | "en";

type HeroAuditCopy = {
  formLabel: string;
  inputLabel: string;
  placeholder: string;
  submit: string;
  hint: string;
  emptyError: string;
  invalidError: string;
  formatError: string;
};

const COPY: Record<HeroAuditLocale, HeroAuditCopy> = {
  fa: {
    formLabel: "شروع ارزیابی خودکار سایت",
    inputLabel: "آدرس عمومی سایت خود را وارد کنید",
    placeholder: "آدرس سایت (مثلاً example.com)",
    submit: "شروع ارزیابی خودکار",
    hint: "برای شروع، آدرس عمومی سایت کافی است.",
    emptyError: "لطفاً آدرس سایت را وارد کنید.",
    invalidError: "آدرس واردشده معتبر نیست.",
    formatError: "فرمت آدرس صحیح نیست. نمونه: https://example.com",
  },
  en: {
    formLabel: "Start automated website audit",
    inputLabel: "Enter your public website address",
    placeholder: "Website address (for example, example.com)",
    submit: "Start automated audit",
    hint: "A public website address is enough to start.",
    emptyError: "Enter a website address.",
    invalidError: "The website address is not valid.",
    formatError: "Use a valid website address, for example https://example.com.",
  },
};

export function buildHeroAuditDestination(url: string, locale: HeroAuditLocale): string {
  void locale;
  const base = "/audit";
  return `${base}?url=${encodeURIComponent(url)}`;
}

export default function HeroAuditForm({ locale = "fa" }: { locale?: HeroAuditLocale }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const copy = COPY[locale];

  function normalizeUrl(raw: string): string {
    const cleaned = raw.trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setError(copy.emptyError);
      return;
    }

    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        setError(copy.invalidError);
        return;
      }
    } catch {
      setError(copy.formatError);
      return;
    }

    setError("");
    window.location.href = buildHeroAuditDestination(normalizedUrl, locale);
  }

  return (
    <form onSubmit={onSubmit} className="hero-audit-form" aria-label={copy.formLabel}>
      <div className="hero-audit-input-group">
        <label htmlFor="hero-audit-url" className="sr-only">
          {copy.inputLabel}
        </label>
        <input
          id="hero-audit-url"
          type="text"
          inputMode="url"
          dir="ltr"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          placeholder={copy.placeholder}
          className="hero-audit-input"
          aria-describedby={error ? "hero-audit-error" : undefined}
          aria-invalid={!!error}
          required
        />
        <button type="submit" className="hero-audit-button">
          {copy.submit}
        </button>
      </div>
      {error && (
        <p id="hero-audit-error" className="hero-audit-error" role="alert">
          {error}
        </p>
      )}
      <p className="hero-audit-hint">{copy.hint}</p>
    </form>
  );
}
