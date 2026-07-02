"use client";

import { FormEvent, useState } from "react";

export default function HeroAuditForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

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
      setError("لطفا آدرس سایت را وارد کنید.");
      return;
    }

    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        setError("آدرس واردشده معتبر نیست.");
        return;
      }
    } catch {
      setError("فرمت آدرس صحیح نیست. نمونه: https://example.com");
      return;
    }

    setError("");
    window.location.href = `/audit?url=${encodeURIComponent(normalizedUrl)}`;
  }

  return (
    <form onSubmit={onSubmit} className="hero-audit-form" aria-label="شروع ارزیابی سایت">
      <div className="hero-audit-input-group">
        <label htmlFor="hero-audit-url" className="sr-only">
          آدرس سایت خود را وارد کنید
        </label>
        <input
          id="hero-audit-url"
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          placeholder="آدرس سایت خود را وارد کنید (مثلاً example.com)"
          className="hero-audit-input"
          aria-describedby={error ? "hero-audit-error" : undefined}
          aria-invalid={!!error}
          required
        />
        <button type="submit" className="hero-audit-button">
          شروع ارزیابی رایگان
        </button>
      </div>
      {error && (
        <p id="hero-audit-error" className="hero-audit-error" role="alert">
          {error}
        </p>
      )}
      <p className="hero-audit-hint">
        گزارش اولیه رایگان است. نیازی به ثبت‌نام نیست.
      </p>
    </form>
  );
}
