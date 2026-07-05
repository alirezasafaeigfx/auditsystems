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
      className="button secondary"
      style={{
        padding: "0.25rem 0.75rem",
        fontSize: "0.875rem",
        cursor: loading ? "not-allowed" : "pointer"
      }}
    >
      {loading ? "در حال خروج..." : "خروج"}
    </button>
  );
}
