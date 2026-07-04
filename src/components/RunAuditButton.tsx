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
          setError("Security check failed. Please refresh and try again.");
        } else {
          setError(data.error || "Failed to start audit");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!canRun ? (
        <div style={{ padding: "1rem", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "0.5rem" }}>
          <p style={{ color: "#92400e", fontSize: "0.875rem", fontWeight: 600 }}>
            Free plan limit reached ({limit} audits/month)
          </p>
          <p style={{ color: "#92400e", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Upgrade to run more audits.
          </p>
        </div>
      ) : (
        <button
          onClick={handleRun}
          disabled={loading || success}
          style={{
            background: success ? "#059669" : "#0f7a66",
            color: "#fff",
            padding: "0.5rem 1.5rem",
            borderRadius: "0.375rem",
            border: "none",
            fontWeight: 600,
            cursor: loading || success ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {success ? "Audit started!" : loading ? "Starting..." : "Run New Audit"}
        </button>
      )}

      {error && (
        <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
      )}

      <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.5rem" }}>
        {monthlyAudits} / {limit} audits used this month
      </p>
    </div>
  );
}
