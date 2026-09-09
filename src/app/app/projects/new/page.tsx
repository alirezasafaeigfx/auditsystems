"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCSRFHeaders } from "../../../../lib/csrf-client";
import { ProjectLimitNotice } from "../../../../components/ProjectLimitNotice";
import { parseProjectLimitResponse, type ProjectLimitResponse } from "../../../../lib/project-limit-response";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [genericError, setGenericError] = useState("");
  const [projectLimit, setProjectLimit] = useState<ProjectLimitResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGenericError("");
    setProjectLimit(null);
    setLoading(true);

    try {
      const csrf = await fetchCSRFHeaders();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ name: name.trim(), url: url.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        const quotaResponse = parseProjectLimitResponse(data);

        if (quotaResponse) {
          setProjectLimit(quotaResponse);
        } else if (data.error === "FORBIDDEN") {
          setGenericError("خطای امنیتی. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.");
        } else {
          setGenericError("خطا در ایجاد پروژه");
        }
        return;
      }

      router.push(`/app/projects/${data.projectId}`);
    } catch {
      setGenericError("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "32rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>افزودن پروژه</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="name" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
            نام پروژه
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً وب‌سایت شرکت من"
            required
            style={{ width: "100%", border: "1px solid var(--border, #d1d5db)", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--surface, #fff)", color: "var(--text, #111827)" }}
          />
        </div>

        <div>
          <label htmlFor="url" style={{ display: "block", fontWeight: 600, marginBottom: "0.375rem", fontSize: "0.875rem" }}>
            آدرس وب‌سایت
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            style={{ width: "100%", border: "1px solid var(--border, #d1d5db)", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--surface, #fff)", color: "var(--text, #111827)" }}
          />
        </div>

        {projectLimit && (
          <ProjectLimitNotice
            current={projectLimit.usage.current}
            limit={projectLimit.usage.limit}
            upgradeUrl={projectLimit.upgradeUrl}
          />
        )}

        {genericError && (
          <div role="alert" style={{ color: "var(--danger, #dc2626)", fontSize: "0.875rem", padding: "0.75rem", background: "var(--danger-bg, #fef2f2)", borderRadius: "0.375rem" }}>
            {genericError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="button"
          style={{
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            alignSelf: "start"
          }}
        >
          {loading ? "در حال ایجاد..." : "ایجاد پروژه"}
        </button>
      </form>
    </div>
  );
}
