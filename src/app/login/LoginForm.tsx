"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCSRFHeaders } from "../../lib/csrf-client";
import { safeNextPath } from "../../lib/safe-next-path";

const copy = {
  fa: {
    heading: "ورود به حساب", emailLabel: "ایمیل", passwordLabel: "رمز عبور",
    invalid: "ایمیل یا رمز عبور نادرست است", forbidden: "خطای امنیتی. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.",
    failed: "خطا در ورود. لطفاً دوباره تلاش کنید.", network: "خطای شبکه. لطفاً دوباره تلاش کنید.",
    loading: "در حال ورود...", submit: "ورود", noAccount: "حساب ندارید؟", signup: "ثبت‌نام کنید",
  },
  en: {
    heading: "Log in to your account", emailLabel: "Email", passwordLabel: "Password",
    invalid: "The email or password is incorrect.", forbidden: "Security check failed. Refresh the page and try again.",
    failed: "Unable to log in. Please try again.", network: "Network error. Please try again.",
    loading: "Logging in...", submit: "Log in", noAccount: "Need an account?", signup: "Create account",
  },
} as const;

export default function LoginForm({ locale }: { locale: "fa" | "en" }) {
  const router = useRouter();
  const text = copy[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "INVALID_CREDENTIALS") setError(text.invalid);
        else if (data.error === "FORBIDDEN") setError(text.forbidden);
        else setError(text.failed);
        return;
      }
      const requestedNext = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next");
      router.push(safeNextPath(requestedNext));
    } catch {
      setError(text.network);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: "100%", border: "1px solid var(--border, #d1d5db)", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--surface, #fff)", color: "var(--text, #111827)" };
  const labelStyle = { display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <div className="card" style={{ width: "100%", maxWidth: "24rem", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>{text.heading}</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div><label htmlFor="email" style={labelStyle}>{text.emailLabel}</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required style={inputStyle} /></div>
          <div><label htmlFor="password" style={labelStyle}>{text.passwordLabel}</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={text.passwordLabel} required style={inputStyle} /></div>
          {error ? <div role="alert" style={{ color: "var(--danger, #dc2626)", fontSize: "0.875rem", padding: "0.75rem", background: "var(--danger-bg, #fef2f2)", borderRadius: "0.375rem" }}>{error}</div> : null}
          <button type="submit" disabled={loading} className="button" style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? text.loading : text.submit}</button>
        </form>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>
          {text.noAccount} <Link href="/signup" style={{ color: "var(--brand, #2563eb)", textDecoration: "none" }}>{text.signup}</Link>
        </p>
      </div>
    </div>
  );
}
