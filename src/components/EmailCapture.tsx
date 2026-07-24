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
      <div style={{ textAlign: "center", padding: "1.5rem", background: "color-mix(in srgb, var(--success) 8%, var(--surface))", borderRadius: "0.5rem", border: "1px solid color-mix(in srgb, var(--success) 30%, var(--line))" }}>
        <p style={{ fontWeight: 600, color: "var(--success)" }}>ایمیل شما ثبت شد!</p>
        <p style={{ fontSize: "0.875rem", color: "var(--success)" }}>گزارش کامل به ایمیل شما ارسال خواهد شد.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", background: "var(--surface-soft)", borderRadius: "0.5rem", border: "1px solid var(--line)" }}>
      <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>گزارش کامل + چک‌لیست اقدام را در ایمیل خود دریافت کنید</p>
      <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "1rem" }}>ایمیل خود را وارد کنید تا گزارش کامل با جزئیات و نقشه اقدام برای شما ارسال شود.</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{ flex: 1, padding: "0.75rem", border: "1px solid var(--line-strong)", borderRadius: "0.375rem", fontSize: "0.875rem" }}
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
          style={{ padding: "0.75rem 1.5rem", background: "var(--brand)", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
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
