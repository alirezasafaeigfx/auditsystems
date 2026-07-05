"use client";

import { useState } from "react";
import { fetchCSRFHeaders } from "../lib/csrf-client";

type Props = {
  projectId: string;
  monthlyAudits: number;
  limit: number;
};

export function RunAuditButton({ projectId, monthlyAudits, limit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canRun = monthlyAudits < limit;

  async function handleRun() {
    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch(`/api/projects/${projectId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf }
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "FORBIDDEN") {
          setError("خطای امنیتی. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.");
        } else {
          setError(data.error || "خطا در شروع ممیزی");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setError("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!canRun ? (
        <div style={{ padding: "1rem", background: "var(--warn-bg, #fef3c7)", border: "1px solid var(--warn-border, #f59e0b)", borderRadius: "0.5rem" }}>
          <p style={{ color: "var(--warn, #92400e)", fontSize: "0.875rem", fontWeight: 600 }}>
            سقف ممیزی ماهانه رسیده ({limit} ممیزی در ماه)
          </p>
          <p style={{ color: "var(--warn, #92400e)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            برای اجرای ممیزی بیشتر، اشتراک خود را ارتقا دهید.
          </p>
        </div>
      ) : (
        <button
          onClick={handleRun}
          disabled={loading || success}
          className="button"
          style={{
            background: success ? "#059669" : undefined,
            cursor: loading || success ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {success ? "ممیزی شروع شد!" : loading ? "در حال شروع..." : "اجرای ممیزی جدید"}
        </button>
      )}

      {error && (
        <p style={{ color: "var(--danger, #dc2626)", fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
      )}

      <p style={{ color: "var(--muted, #9ca3af)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
        {monthlyAudits} از {limit} ممیزی این ماه استفاده شده
      </p>
    </div>
  );
}
