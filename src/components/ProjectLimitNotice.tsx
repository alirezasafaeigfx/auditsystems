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
        color: "var(--warn, #92400e)",
        fontSize: "0.875rem",
        padding: "0.75rem",
        background: "var(--warn-bg, #fffbeb)",
        border: "1px solid var(--warn-border, #fcd34d)",
        borderRadius: "0.375rem",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>سقف پروژه‌های این اشتراک تکمیل شده است.</div>
      <div>{current} / {limit} پروژه استفاده شده است.</div>
      <a href={upgradeUrl} style={{ color: "inherit", display: "inline-block", fontWeight: 600, marginTop: "0.5rem" }}>
        اشتراک خود را ارتقا دهید
      </a>
    </div>
  );
}
