"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error === "INVALID_CREDENTIALS" ? "Invalid email or password" : "Login failed. Please try again.");
        return;
      }

      router.push("/app");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <div style={{ width: "100%", maxWidth: "24rem", padding: "2rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>Login</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
            />
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "0.875rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "0.375rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#0f7a66",
              color: "#fff",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.375rem",
              border: "none",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: "#0f7a66", textDecoration: "none" }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
