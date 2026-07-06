import type { ChecklistItem, SampleLocale } from "../../lib/sample-report/types";
import type { SampleReportCopy } from "../../lib/sample-report/copy";

type ChecklistSectionProps = {
  title: string;
  items: ChecklistItem[];
  locale: SampleLocale;
  copy: SampleReportCopy;
};

export default function ChecklistSection({ title, items, locale, copy }: ChecklistSectionProps) {
  return (
    <section className="card grid">
      <h2>{title}</h2>
      <div className="grid" style={{ gap: "0.5rem" }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.5rem",
              border: "1px solid var(--line)",
              borderRadius: "8px",
            }}
          >
            <span style={{ fontWeight: 600 }}>{item.label[locale]}</span>
            <span className={`badge ${item.status === "missing" ? "sev-medium" : ""}`}>
              {item.status === "present" ? copy.present : copy.missing}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}