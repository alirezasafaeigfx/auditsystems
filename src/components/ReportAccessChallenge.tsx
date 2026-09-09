"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ReportAccessChallenge({ token, locale }: { token: string; locale: "fa" | "en" }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fa = locale === "fa";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      if (!response.ok) {
        setError(fa ? "رمز معتبر نیست یا دسترسی ممکن نیست." : "The password is invalid or access is unavailable.");
        return;
      }
      router.refresh();
    } catch {
      setError(fa ? "دسترسی موقتاً ممکن نیست. دوباره تلاش کنید." : "Access is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <section className="card">
        <h1>{fa ? "این گزارش محافظت شده است" : "This report is protected"}</h1>
        <p>{fa ? "برای مشاهده گزارش، رمز دسترسی را وارد کنید." : "Enter the access password to view this report."}</p>
        <form onSubmit={submit}>
          <label htmlFor="report-access-password">{fa ? "رمز دسترسی" : "Access password"}</label>
          <input
            id="report-access-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? (fa ? "در حال بررسی…" : "Checking…") : (fa ? "مشاهده گزارش" : "View report")}
          </button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}

