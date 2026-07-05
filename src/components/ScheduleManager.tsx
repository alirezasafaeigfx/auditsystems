"use client";

import { useState, useEffect } from "react";

type Schedule = {
  id: string;
  frequency: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
};

type Props = {
  projectId: string;
  canSchedule: boolean;
};

export function ScheduleManager({ projectId, canSchedule }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/schedule`)
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data.schedules || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  async function handleCreate(frequency: string) {
    setError("");
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "خطا در ایجاد زمان‌بندی");
        return;
      }
      setSchedules((prev) => [...prev, data.schedule]);
    } catch {
      setError("خطای شبکه");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>بارگذاری...</p>;
  }

  if (!canSchedule) {
    return (
      <div style={{ padding: "1rem", background: "var(--warn-bg, #fffbeb)", border: "1px solid var(--warn-border, #fde68a)", borderRadius: "0.5rem" }}>
        <p style={{ color: "var(--warn, #92400e)", fontSize: "0.875rem", fontWeight: 600 }}>
          ممیزی زمان‌بندی شده فقط در پلن پرو و بالاتر فعال است.
        </p>
        <a href="/app/billing" style={{ color: "var(--brand, #0f7a66)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
          ارتقای اشتراک ←
        </a>
      </div>
    );
  }

  return (
    <div>
      {schedules.length === 0 ? (
        <div style={{ padding: "1rem", background: "var(--brand-bg, #f0fdf4)", border: "1px solid #bbf7d0", borderRadius: "0.5rem" }}>
          <p style={{ color: "var(--brand-strong, #065f46)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
            هنوز ممیزی زمان‌بندی شده‌ای فعال نیست.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => handleCreate("WEEKLY")}
              disabled={creating}
              className="button"
              style={{ fontSize: "0.875rem", cursor: creating ? "not-allowed" : "pointer" }}
            >
              {creating ? "در حال ایجاد..." : "فعال‌سازی هفتگی"}
            </button>
            <button
              onClick={() => handleCreate("MONTHLY")}
              disabled={creating}
              className="button secondary"
              style={{ fontSize: "0.875rem", cursor: creating ? "not-allowed" : "pointer" }}
            >
              {creating ? "در حال ایجاد..." : "فعال‌سازی ماهانه"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {schedules.map((s) => (
            <div key={s.id} className="card" style={{ padding: "1rem", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {s.frequency === "WEEKLY" ? "هفتگی" : "ماهانه"}
                </span>
                {s.enabled && (
                  <span className="badge sev-low" style={{ marginRight: "0.5rem" }}>فعال</span>
                )}
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  اجرای بعدی: {new Date(s.nextRunAt).toLocaleDateString("fa-IR")}
                  {s.lastRunAt && ` · آخرین اجرا: ${new Date(s.lastRunAt).toLocaleDateString("fa-IR")}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: "var(--danger, #dc2626)", fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
      )}
    </div>
  );
}
