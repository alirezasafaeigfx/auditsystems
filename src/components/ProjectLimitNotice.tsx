type ProjectLimitNoticeProps = {
  current: number;
  limit: number;
  upgradeUrl: string;
};

export function ProjectLimitNotice({ current, limit, upgradeUrl }: ProjectLimitNoticeProps) {
  return (
    <div
      role="alert"
      style={{
        color: "var(--text)",
        fontSize: "0.875rem",
        padding: "0.75rem",
        background: "color-mix(in srgb, var(--warn) 12%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--warn) 35%, var(--line))",
        borderRadius: "0.375rem",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>سقف پروژه‌های این اشتراک تکمیل شده است.</div>
      <div>{current} / {limit} پروژه استفاده شده است.</div>
      <a href={upgradeUrl} style={{ color: "inherit", display: "inline-block", fontWeight: 600, marginTop: "0.5rem", textDecoration: "underline" }}>
        اشتراک خود را ارتقا دهید
      </a>
    </div>
  );
}
