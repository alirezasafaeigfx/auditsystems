"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.valid) {
          setStatus("success");
          setMessage("Email verified successfully! You can now access all features.");
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. The token may be expired or already used.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: "24rem", width: "100%", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Email Verification</h1>
        {status === "loading" && (
          <p style={{ color: "var(--muted)" }}>Verifying your email...</p>
        )}
        {status === "success" && (
          <div style={{ padding: "1rem", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "0.5rem", color: "var(--success)" }}>
            {message}
            <div style={{ marginTop: "1rem" }}>
              <a href="/app" style={{ color: "#2563eb", fontWeight: 600 }}>Go to Dashboard →</a>
            </div>
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: "1rem", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "0.5rem", color: "var(--danger)" }}>
            {message}
            <div style={{ marginTop: "1rem" }}>
              <a href="/login" style={{ color: "#2563eb", fontWeight: 600 }}>Back to Login</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
