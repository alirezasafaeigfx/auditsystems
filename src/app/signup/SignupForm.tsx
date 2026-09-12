"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCSRFHeaders } from "../../lib/csrf-client";

type SignupLocale = "fa" | "en";

const copy = {
  fa: {
    heading: "ایجاد حساب کاربری", name: "نام", namePlaceholder: "نام خود را وارد کنید", email: "ایمیل",
    passwordLabel: "رمز عبور", passwordPlaceholder: "حداقل ۸ کاراکتر",
    emailTaken: "حساب کاربری با این ایمیل قبلاً ثبت شده است.", passwordTooShort: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
    forbidden: "خطای امنیتی. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.", genericError: "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.",
    networkError: "خطای شبکه. لطفاً دوباره تلاش کنید.", loading: "در حال ایجاد حساب...", submit: "ثبت‌نام",
    existingAccount: "قبلاً حساب دارید؟", login: "ورود",
  },
  en: {
    heading: "Create account", name: "Name", namePlaceholder: "Enter your name", email: "Email",
    passwordLabel: "Password", passwordPlaceholder: "At least 8 characters",
    emailTaken: "An account with this email already exists.", passwordTooShort: "Your password must be at least 8 characters.",
    forbidden: "Security check failed. Refresh the page and try again.", genericError: "Could not create your account. Please try again.",
    networkError: "Network error. Please try again.", loading: "Creating account...", submit: "Create account",
    existingAccount: "Already have an account?", login: "Log in",
  },
} as const;

export default function SignupForm({ locale }: { locale: SignupLocale }) {
  const router = useRouter();
  const text = copy[locale];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "EMAIL_TAKEN") setError(text.emailTaken);
        else if (data.error === "PASSWORD_TOO_SHORT") setError(text.passwordTooShort);
        else if (data.error === "FORBIDDEN") setError(text.forbidden);
        else setError(text.genericError);
        return;
      }
      router.push("/app");
    } catch {
      setError(text.networkError);
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
          <div><label htmlFor="name" style={labelStyle}>{text.name}</label><input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={text.namePlaceholder} style={inputStyle} /></div>
          <div><label htmlFor="email" style={labelStyle}>{text.email}</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} /></div>
          <div><label htmlFor="password" style={labelStyle}>{text.passwordLabel}</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={text.passwordPlaceholder} required minLength={8} style={inputStyle} /></div>
          {error && <div role="alert" style={{ color: "var(--danger, #dc2626)", fontSize: "0.875rem", padding: "0.75rem", background: "var(--danger-bg, #fef2f2)", borderRadius: "0.375rem" }}>{error}</div>}
          <button type="submit" disabled={loading} className="button" style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? text.loading : text.submit}</button>
        </form>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>{text.existingAccount} <Link href="/login" style={{ color: "var(--brand, #2563eb)", textDecoration: "none" }}>{text.login}</Link></p>
      </div>
    </div>
  );
}
