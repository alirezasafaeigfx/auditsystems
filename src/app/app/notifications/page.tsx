"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCSRFHeaders } from "../../../lib/csrf-client";

type NotificationPreferences = {
  emailEnabled: boolean;
};

type NotificationHistoryItem = {
  id: string;
  type: string;
  subject: string;
  email: string;
  sentAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [prefRes, histRes] = await Promise.all([
          fetch("/api/notifications/preferences", { cache: "no-store" }),
          fetch("/api/notifications/history", { cache: "no-store" })
        ]);

        if (prefRes.status === 401 || histRes.status === 401) {
          router.push("/login");
          return;
        }

        const prefData = await prefRes.json();
        const histData = await histRes.json();

        setPreferences(prefData.preferences ?? { emailEnabled: true });
        setHistory(histData.history ?? []);
      } catch {
        setError("خطا در بارگذاری تنظیمات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function toggleEmailNotifications() {
    if (!preferences) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ emailEnabled: !preferences.emailEnabled })
      });

      if (!res.ok) {
        setError("خطا در ذخیره تنظیمات");
        return;
      }

      const data = await res.json();
      setPreferences(data.preferences);
      setSuccess(data.preferences.emailEnabled ? "اعلان ایمیل فعال شد" : "اعلان ایمیل غیرفعال شد");
    } catch {
      setError("خطا در ذخیره تنظیمات");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted, #6b7280)" }}>
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>اعلانات</h1>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>تنظیمات ایمیل</h2>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "var(--danger-bg, #fee2e2)", border: "1px solid #fca5a5", borderRadius: "0.5rem", marginBottom: "1rem", color: "var(--danger, #991b1b)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "0.75rem 1rem", background: "var(--brand-bg, #f0fdf4)", border: "1px solid color-mix(in srgb, var(--success) 30%, var(--line))", borderRadius: "0.5rem", marginBottom: "1rem", color: "var(--brand-strong, #065f46)", fontSize: "0.875rem" }}>
            {success}
          </div>
        )}

        <div className="card" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>اعلان تکمیل ممیزی</div>
            <div style={{ color: "var(--muted, #6b7280)", fontSize: "0.8125rem" }}>
              ایمیلی با جزئیات امتیاز و یافته‌ها دریافت کنید
            </div>
          </div>
          <button
            onClick={toggleEmailNotifications}
            disabled={saving}
            style={{
              padding: "0.375rem 1rem",
              borderRadius: "9999px",
              border: "none",
              background: preferences?.emailEnabled ? "var(--brand, #2563eb)" : "var(--muted, #9ca3af)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? "در حال ذخیره..." : preferences?.emailEnabled ? "فعال" : "غیرفعال"}
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>تاریخچه اعلانات</h2>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", color: "var(--muted, #6b7280)" }}>
            هنوز اعلانی ارسال نشده است
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>موضوع</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>ایمیل</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ ارسال</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "0.75rem" }}>{item.subject}</td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{item.email}</td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{formatDate(item.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
