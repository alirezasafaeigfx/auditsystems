"use client";

import { useState } from "react";

export function EmailCapture({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch(`/api/reports/${token}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consentPrivacy })
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem", background: "#f0fdf4", borderRadius: "0.5rem", border: "1px solid #bbf7d0" }}>
        <p style={{ fontWeight: 600, color: "#065f46" }}>ایمیل شما ثبت شد!</p>
        <p style={{ fontSize: "0.875rem", color: "#059669" }}>گزارش کامل به ایمیل شما ارسال خواهد شد.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", background: "#f9fafb", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
      <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>گزارش کامل + چک‌لیست اقدام را در ایمیل خود دریافت کنید</p>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>ایمیل خود را وارد کنید تا گزارش کامل با جزئیات و نقشه اقدام برای شما ارسال شود.</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{ flex: 1, padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem" }}
        />
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.8rem", color: "#4b5563" }}>
          <input
            type="checkbox"
            checked={consentPrivacy}
            onChange={(e) => setConsentPrivacy(e.target.checked)}
            required
          />
          <span>با ذخیره ایمیل برای پیگیری همین گزارش موافقم.</span>
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          style={{ padding: "0.75rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
        >
          {status === "loading" ? "در حال ارسال..." : "ارسال"}
        </button>
      </form>
      {status === "error" && (
        <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.5rem" }}>خطا در ثبت ایمیل. لطفاً دوباره تلاش کنید.</p>
      )}
    </div>
  );
}
