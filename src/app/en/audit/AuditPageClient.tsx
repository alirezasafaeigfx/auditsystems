"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { trackSeoEvent } from "../../../lib/analytics";

export default function AuditPageClientEn() {
  const [url, setUrl] = useState("https://example.com");
  const [depth, setDepth] = useState<"QUICK" | "DEEP">("QUICK");
  const [message, setMessage] = useState("");
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackSeoEvent("seo_audit_page_view", { locale: "en", path: "/en/audit" });
    const params = new URLSearchParams(window.location.search);
    const prefillUrl = params.get("url");
    if (prefillUrl) {
      setUrl(decodeURIComponent(prefillUrl));
    }
  }, []);

  function toUserMessage(errorCode: string): string {
    if (errorCode === "RATE_LIMITED") return "Too many requests. Please retry in a few minutes.";
    if (errorCode === "DNS_LOOKUP_FAILED") return "DNS lookup is required for this domain; please try again shortly.";
    if (errorCode === "RATE_LIMIT_BACKEND_REQUIRED") return "Distributed rate-limit backend is temporarily unavailable. Please retry shortly.";
    if (errorCode === "INVALID_URL_EMPTY") return "Target URL is required.";
    if (errorCode === "INVALID_URL_TOO_LONG") return "Target URL is too long.";
    if (errorCode.startsWith("INVALID_URL_")) return "URL is invalid. Provide a full public URL.";
    if (errorCode.startsWith("SSRF_BLOCKED_")) return "This URL is blocked. Use a reachable public hostname.";
    return "Failed to create audit run. Please try again.";
  }

  function normalizeUrl(raw: string): string {
    const cleaned = raw.trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setMessage("Please enter a website URL.");
      return;
    }

    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        setMessage("Invalid URL. Please enter a full domain.");
        return;
      }
    } catch {
      setMessage("Invalid URL format. Example: https://example.com");
      return;
    }

    trackSeoEvent("seo_audit_start", { locale: "en", depth });
    setIsSubmitting(true);
    setMessage("Submitting audit run...");
    setReportPath(null);

    try {
      const response = await fetch("/api/audit/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, depth })
      });

      const body = await response.json();
      if (!response.ok) {
        setMessage(toUserMessage(String(body.error ?? "")));
        return;
      }

      const nextPath = `/en/audit/r/${body.token}`;
      setReportPath(nextPath);
      setMessage(`Run created: ${body.runId}`);
      trackSeoEvent("seo_audit_run_created", { locale: "en", depth, run_status: String(body.status ?? "QUEUED") });
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section className="card hero">
        <h1>Run a New Audit</h1>
        <p>Submit a target URL and get a shareable report token. Worker execution starts automatically after enqueue.</p>
      </section>

      <section className="grid-2">
        <section className="card">
          <form onSubmit={onSubmit} className="grid">
            <label>
              Target URL
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
            </label>
            <label>
              Depth
              <select value={depth} onChange={(e) => setDepth(e.target.value as "QUICK" | "DEEP")}>
                <option value="QUICK">Quick</option>
                <option value="DEEP">Deep</option>
              </select>
            </label>
            <p>Quick runs a fast baseline scan. Deep applies broader checks on discovered resources.</p>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Create Audit Run"}
            </button>
          </form>
        </section>

        <section className="card grid">
          <h2>Run Status</h2>
          <p role="status" aria-live="polite">
            {message || "No run submitted yet."}
          </p>
          {reportPath ? (
            <p>
              <Link href={reportPath}>Open Report</Link>
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
