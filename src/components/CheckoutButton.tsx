"use client";

import { useState } from "react";
import { fetchCSRFHeaders } from "../lib/csrf-client";

type Props = {
  planCode: string;
  label: string;
};

export function CheckoutButton({ planCode, label }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrf
        },
        body: JSON.stringify({ planCode })
      });

      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (res.ok) {
        window.location.href = "/app/billing?status=success";
      } else {
        window.location.href = "/app/billing?status=failed";
      }
    } catch {
      window.location.href = "/app/billing?status=failed";
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      style={{
        width: "100%",
        padding: "0.5rem",
        background: loading ? "#9ca3af" : "#0f7a66",
        color: "#fff",
        border: "none",
        borderRadius: "0.375rem",
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "0.875rem"
      }}
    >
      {loading ? "Processing..." : label}
    </button>
  );
}
