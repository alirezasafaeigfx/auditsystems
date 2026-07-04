"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCSRFHeaders, resetCSRFToken } from "../lib/csrf-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const csrf = await fetchCSRFHeaders();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: csrf
      });
      resetCSRFToken();
      router.push("/login");
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        background: "none",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        padding: "0.25rem 0.75rem",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "0.875rem"
      }}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
