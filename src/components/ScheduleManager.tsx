"use client";

import { useState } from "react";

type Schedule = {
  id: string;
  frequency: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
};

export function ScheduleManager({
  projectId,
  schedule,
  canSchedule
}: {
  projectId: string;
  schedule: Schedule | null;
  canSchedule: boolean;
}) {
  const [frequency, setFrequency] = useState(schedule?.frequency ?? "WEEKLY");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!canSchedule) {
    return (
      <div style={{ padding: "1.5rem", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "0.5rem" }}>
        <p style={{ fontWeight: 600, color: "#92400e" }}>ممیزی زمان‌بندی شده</p>
        <p style={{ fontSize: "0.875rem", color: "#92400e", marginTop: "0.5rem" }}>
          برای استفاده از ممیزی زمان‌بندی شده، ابتدا پلن خود را ارتقا دهید.
        </p>
      </div>
    );
  }

  async function handleSave() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, enabled })
      });
      if (res.ok) {
        setMessage("ذخیره شد!");
      } else {
        const data = await res.json();
        setMessage(data.error ?? "خطا در ذخیره");
      }
    } catch {
      setMessage("خطا در ارتباط با سرور");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
      <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>ممیزی زمان‌بندی شده</h3>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
        <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>فعال:</label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          style={{ width: "1.25rem", height: "1.25rem" }}
        />
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
        <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>دوره:</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
        >
          <option value="WEEKLY">هفتگی</option>
          <option value="MONTHLY">ماهانه</option>
        </select>
      </div>

      {schedule?.nextRunAt && (
        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "1rem" }}>
          اجرای بعدی: {new Date(schedule.nextRunAt).toLocaleDateString("fa-IR")}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        style={{ padding: "0.75rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 600 }}
      >
        {loading ? "در حال ذخیره..." : "ذخیره"}
      </button>

      {message && (
        <p style={{ fontSize: "0.875rem", color: message.includes("خطا") ? "#dc2626" : "#059669", marginTop: "0.5rem" }}>
          {message}
        </p>
      )}
    </div>
  );
}
