"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCSRFHeaders } from "../../lib/csrf-client";

export default function LoginPage() {
  const router = useRouter();
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "INVALID_CREDENTIALS") {
          setError("ایمیل یا رمز عبور نادرست است");
        } else if (data.error === "FORBIDDEN") {
          setError("خطای امنیتی. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.");
        } else {
          setError("خطا در ورود. لطفاً دوباره تلاش کنید.");
        }
        return;
      }

      router.push("/app");
    } catch {
      setError("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <div className="card" style={{ width: "100%", maxWidth: "24rem", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>ورود به حساب</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: "100%", border: "1px solid var(--border, #d1d5db)", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--surface, #fff)", color: "var(--text, #111827)" }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبور"
              required
              style={{ width: "100%", border: "1px solid var(--border, #d1d5db)", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--surface, #fff)", color: "var(--text, #111827)" }}
            />
          </div>

          {error && (
            <div style={{ color: "var(--danger, #dc2626)", fontSize: "0.875rem", padding: "0.75rem", background: "var(--danger-bg, #fef2f2)", borderRadius: "0.375rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="button"
            style={{
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "در حال ورود..." : "ورود"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>
          حساب ندارید؟ <Link href="/signup" style={{ color: "var(--brand, #0f7a66)", textDecoration: "none" }}>ثبت‌نام کنید</Link>
        </p>
      </div>
    </div>
  );
}
