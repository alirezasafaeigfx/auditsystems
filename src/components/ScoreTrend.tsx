"use client";

type AuditScore = { score: number; createdAt: string };

type Props = {
  audits: AuditScore[];
};

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function trendIndicator(scores: number[]): { label: string; color: string; arrow: string } {
  if (scores.length < 2) return { label: "پایدار", color: "#6b7280", arrow: "→" };
  const recent = scores.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const older = scores.slice(0, -3);
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : avg;
  const diff = avg - olderAvg;
  if (diff > 3) return { label: "بهبود", color: "#22c55e", arrow: "↑" };
  if (diff < -3) return { label: "کاهش", color: "#ef4444", arrow: "↓" };
  return { label: "پایدار", color: "#6b7280", arrow: "→" };
}

export function ScoreTrend({ audits }: Props) {
  if (audits.length === 0) return null;

  const scores = audits.map((a) => a.score);
  const trend = trendIndicator(scores);
  const latest = scores[scores.length - 1];

  const width = 400;
  const height = 120;
  const padX = 8;
  const padY = 16;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const minScore = 0;
  const maxScore = 100;

  const points = scores.map((s, i) => {
    const x = padX + (i / Math.max(scores.length - 1, 1)) * plotW;
    const y = padY + plotH - ((s - minScore) / (maxScore - minScore)) * plotH;
    return { x, y, score: s };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>روند امتیاز</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: trend.color, fontWeight: 600 }}>
            {trend.arrow} {trend.label}
          </span>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: scoreColor(latest) }}>
            {latest}/100
          </span>
        </div>
      </div>
      <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: "0.5rem", padding: "1rem", background: "var(--surface, #f9fafb)" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="نمودار روند امتیاز">
          <path d={areaPath} fill={scoreColor(latest)} fillOpacity={0.1} />
          <path d={linePath} fill="none" stroke={scoreColor(latest)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={scoreColor(p.score)} stroke="white" strokeWidth={1.5} />
          ))}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", color: "var(--muted, #9ca3af)", marginTop: "0.25rem" }}>
          <span>{audits.length > 1 ? new Date(audits[0].createdAt).toLocaleDateString("fa-IR") : ""}</span>
          <span>{new Date(audits[audits.length - 1].createdAt).toLocaleDateString("fa-IR")}</span>
        </div>
      </div>
    </div>
  );
}
