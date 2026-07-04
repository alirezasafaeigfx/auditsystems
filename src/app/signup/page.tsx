"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "EMAIL_TAKEN") {
          setError("An account with this email already exists.");
        } else if (data.error === "PASSWORD_TOO_SHORT") {
          setError("Password must be at least 8 characters.");
        } else {
          setError("Signup failed. Please try again.");
        }
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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>Create Account</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="name" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
            />
          </div>

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
              placeholder="At least 8 characters"
              required
              minLength={8}
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
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Already have an account? <Link href="/login" style={{ color: "#0f7a66", textDecoration: "none" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
