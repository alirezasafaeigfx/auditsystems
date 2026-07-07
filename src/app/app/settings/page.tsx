"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCSRFHeaders } from "../../../lib/csrf-client";

type Session = {
  id: string;
  tokenPrefix: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
};

function SecurityTips() {
  const tips = [
    "نشست‌ها پس از ۷ روز منقضی می‌شوند.",
    "در صورت مشاهده نشست ناشناخته، فوراً آن را حذف کنید.",
    "با حذف نشست‌های دیگر، کاربران آنها از سیستم خارج می‌شوند.",
    "برای خروج کامل از تمام دستگاه‌ها، از دکمه حذف همه نشست‌های دیگر استفاده کنید."
  ];
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>
      {tips.map((tip, i) => (
        <li key={i} style={{ marginBottom: "0.5rem" }}>{tip}</li>
      ))}
    </ul>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/sessions", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setSessions(data.sessions ?? []);
      } catch {
        setError("خطا در بارگذاری نشست\u200Cها");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function revokeSession(id: string) {
    setRevoking(id);
    setError(null);
    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch(`/api/auth/sessions?id=${id}`, {
        method: "DELETE",
        headers: csrf
      });
      const data = await res.json();
      if (data.error) {
        if (data.error === "CANNOT_REVOKE_CURRENT") {
          setError("نمی‌توانید نشست فعلی را حذف کنید");
        } else {
          setError("خطا در حذف نشست");
        }
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("خطا در حذف نشست");
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setRevokingAll(true);
    setError(null);
    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch("/api/auth/sessions?all=true", {
        method: "DELETE",
        headers: csrf
      });
      const data = await res.json();
      if (data.error) {
        setError("خطا در حذف نشست‌ها");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      setError("خطا در حذف نشست‌ها");
    } finally {
      setRevokingAll(false);
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

  const otherSessions = sessions.filter((s) => !s.isCurrent && !s.isExpired);
  const expiredSessions = sessions.filter((s) => s.isExpired);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>تنظیمات و نشست‌ها</h1>

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>نشست‌های فعال</h2>
          {otherSessions.length > 0 && (
            <button
              onClick={revokeAll}
              disabled={revokingAll}
              className="button secondary"
              style={{
                padding: "0.375rem 1rem",
                fontSize: "0.875rem",
                cursor: revokingAll ? "not-allowed" : "pointer",
                color: "var(--danger, #dc2626)",
                borderColor: "var(--danger, #dc2626)"
              }}
            >
              {revokingAll ? "در حال حذف..." : "حذف همه نشست‌های دیگر"}
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "var(--danger-bg, #fee2e2)", border: "1px solid #fca5a5", borderRadius: "0.5rem", marginBottom: "1rem", color: "var(--danger, #991b1b)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted, #6b7280)" }}>
            در حال بارگذاری...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", color: "var(--muted, #6b7280)" }}>
            هیچ نشستی یافت نشد
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>شناسه نشست</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ ایجاد</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ انقضا</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>وضعیت</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)", background: session.isCurrent ? "var(--brand-bg, #f0fdf4)" : undefined }}>
                    <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.8125rem" }}>
                      {session.tokenPrefix}
                      {session.isCurrent && (
                        <span style={{ marginRight: "0.5rem", fontSize: "0.75rem", color: "var(--brand, #059669)", fontWeight: 600 }}>(فعلی)</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{formatDate(session.createdAt)}</td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #6b7280)" }}>{formatDate(session.expiresAt)}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className={`badge ${session.isExpired ? "sev-critical" : session.isCurrent ? "sev-low" : ""}`}>
                        {session.isExpired ? "منقضی شده" : session.isCurrent ? "فعال" : "فعال"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {!session.isCurrent && !session.isExpired && (
                        <button
                          onClick={() => revokeSession(session.id)}
                          disabled={revoking === session.id}
                          className="button secondary"
                          style={{
                            padding: "0.25rem 0.75rem",
                            fontSize: "0.8125rem",
                            cursor: revoking === session.id ? "not-allowed" : "pointer",
                            color: "var(--danger, #dc2626)",
                            borderColor: "var(--danger, #dc2626)"
                          }}
                        >
                          {revoking === session.id ? "در حال حذف..." : "حذف"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {expiredSessions.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>نشست‌های منقضی شده</h2>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e5e7eb)", background: "var(--surface, #f9fafb)" }}>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>شناسه نشست</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ ایجاد</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontWeight: 600 }}>تاریخ انقضا</th>
                </tr>
              </thead>
              <tbody>
                {expiredSessions.map((session) => (
                  <tr key={session.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--muted, #9ca3af)" }}>{session.tokenPrefix}</td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #9ca3af)" }}>{formatDate(session.createdAt)}</td>
                    <td style={{ padding: "0.75rem", color: "var(--muted, #9ca3af)" }}>{formatDate(session.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>نکات امنیتی</h2>
        <SecurityTips />
      </div>
    </div>
  );
}
