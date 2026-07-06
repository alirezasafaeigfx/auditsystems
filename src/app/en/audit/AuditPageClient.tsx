"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { trackSeoEvent } from "../../../lib/analytics";
import { fetchCSRFHeaders } from "../../../lib/csrf-client";

const RETRYABLE_ERRORS = new Set(["RATE_LIMITED", "DNS_LOOKUP_FAILED", "RATE_LIMIT_BACKEND_REQUIRED"]);

export default function AuditPageClientEn() {
  const [url, setUrl] = useState("https://example.com");
  const [depth, setDepth] = useState<"QUICK" | "DEEP">("QUICK");
  const [message, setMessage] = useState("");
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    trackSeoEvent("seo_audit_page_view", { locale: "en", path: "/en/audit" });
    const params = new URLSearchParams(window.location.search);
    const prefillUrl = params.get("url");
    if (prefillUrl) {
      setUrl(decodeURIComponent(prefillUrl));
    }
  }, []);

  function toUserMessage(errorCode: string): { text: string; retryable: boolean } {
    if (errorCode === "RATE_LIMITED") return { text: "Too many requests. Please retry in a few minutes.", retryable: true };
    if (errorCode === "DNS_LOOKUP_FAILED") return { text: "DNS lookup is required for this domain; please try again shortly.", retryable: true };
    if (errorCode === "RATE_LIMIT_BACKEND_REQUIRED") return { text: "Distributed rate-limit backend is temporarily unavailable. Please retry shortly.", retryable: true };
    if (errorCode === "INVALID_URL_EMPTY") return { text: "Target URL is required.", retryable: false };
    if (errorCode === "INVALID_URL_TOO_LONG") return { text: "Target URL is too long.", retryable: false };
    if (errorCode.startsWith("INVALID_URL_")) return { text: "URL is invalid. Provide a full public URL.", retryable: false };
    if (errorCode.startsWith("SSRF_BLOCKED_")) return { text: "This URL is blocked. Use a reachable public hostname.", retryable: false };
    return { text: "Failed to create audit run. Please try again.", retryable: true };
  }

  function normalizeUrl(raw: string): string {
    const cleaned = raw.trim();
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  }

  const executeAudit = useCallback(async (targetUrl: string, auditDepth: "QUICK" | "DEEP") => {
    setIsSubmitting(true);
    setMessage("Submitting audit run...");
    setReportPath(null);
    setLastError(null);

    try {
      const csrf = await fetchCSRFHeaders();
      const response = await fetch("/api/audit/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ url: targetUrl, depth: auditDepth })
      });

      const body = await response.json();
      if (!response.ok) {
        const errorInfo = toUserMessage(String(body.error ?? ""));
        setMessage(errorInfo.text);
        setLastError(String(body.error ?? ""));
        trackSeoEvent("seo_audit_error", { locale: "en", error_code: String(body.error ?? ""), retryable: errorInfo.retryable });
        return;
      }

      const nextPath = `/en/audit/r/${body.token}`;
      setReportPath(nextPath);
      setLastError(null);
      setRetryCount(0);
      setMessage(`Run created: ${body.runId}`);
      trackSeoEvent("seo_audit_run_created", { locale: "en", depth: auditDepth, run_status: String(body.status ?? "QUEUED") });
    } catch {
      setMessage("Network error. Please try again.");
      setLastError("NETWORK_ERROR");
      trackSeoEvent("seo_audit_error", { locale: "en", error_code: "NETWORK_ERROR", retryable: true });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  function handleRetry() {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;
    setRetryCount((c) => c + 1);
    trackSeoEvent("seo_audit_retry", { locale: "en", retry_count: retryCount + 1 });
    executeAudit(normalizedUrl, depth);
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

    trackSeoEvent("seo_audit_start", { locale: "en", depth, has_url: !!normalizedUrl });
    executeAudit(normalizedUrl, depth);
  }

  const isRetryable = lastError !== null && (
    RETRYABLE_ERRORS.has(lastError) || lastError === "NETWORK_ERROR"
  );

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
          {isRetryable && !isSubmitting && !reportPath ? (
            <p>
              <button type="button" onClick={handleRetry} className="button">
                {retryCount > 0 ? `Retry (${retryCount + 1})` : "Retry"}
              </button>
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
