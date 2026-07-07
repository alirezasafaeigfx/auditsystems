"use client";

import { useState, useEffect } from "react";

type ReferralStats = {
  totalReferrals: number;
  conversions: number;
  referralCode: string | null;
};

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStats(data.stats);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!stats?.referralCode) return;
    const url = `${window.location.origin}/signup?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted, #6b7280)" }}>
        در حال بارگذاری...
      </div>
    );
  }

  if (!stats?.referralCode) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", border: "2px dashed var(--border, #d1d5db)", borderRadius: "0.5rem" }}>
        <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          کد معرف شما هنوز ایجاد نشده
        </p>
        <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem" }}>
          لطفاً دوباره تلاش کنید.
        </p>
      </div>
    );
  }

  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${stats.referralCode}`;

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        معرفی به دوستان
      </h1>
      <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        لینک معرفی خود را با دوستان به اشتراک بگذارید و از مزایای آن بهره‌مند شوید.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
            کد معرف
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "monospace" }}>
            {stats.referralCode}
          </div>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
            تعداد دعوت‌ها
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {stats.totalReferrals}
          </div>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
            تبدیل‌ها
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: stats.conversions > 0 ? "var(--brand, #059669)" : "inherit" }}>
            {stats.conversions}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
          لینک معرفی شما
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            flex: 1,
            minWidth: 0,
            padding: "0.625rem 1rem",
            background: "var(--surface, #f9fafb)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {referralUrl}
          </div>
          <button onClick={handleCopy} className="button" style={{ flexShrink: 0, padding: "0.625rem 1.25rem" }}>
            {copied ? "کپی شد!" : "کپی لینک"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.75rem", marginBottom: "0.5rem", fontWeight: 600 }}>
          چگونه کار می‌کند؟
        </div>
        <ol style={{ margin: 0, paddingInlineStart: "1.25rem", fontSize: "0.875rem", lineHeight: 1.8, color: "var(--muted, #4b5563)" }}>
          <li>لینک معرفی خود را کپی کنید</li>
          <li>آن را با دوستان و همکاران به اشتراک بگذارید</li>
          <li>وقتی آن‌ها با لینک شما ثبت‌نام کنند، در لیست معرفی‌های شما قرار می‌گیرند</li>
          <li>تعداد معرفی‌ها و تبدیل‌های خود را در همین صفحه مشاهده کنید</li>
        </ol>
      </div>
    </div>
  );
}
