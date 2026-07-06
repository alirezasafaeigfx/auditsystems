import type { SampleFinding, SampleLocale } from "../../lib/sample-report/types";
import type { SampleReportCopy } from "../../lib/sample-report/copy";
import { countBySeverity, getTopUrgentFindings } from "../../lib/sample-report/demo-findings";
import { SAMPLE_OVERALL_SCORE, SAMPLE_SCORE_GRADE } from "../../lib/sample-report/types";

type ExecutiveSummaryProps = {
  findings: SampleFinding[];
  locale: SampleLocale;
  copy: SampleReportCopy;
};

export default function ExecutiveSummary({ findings, locale, copy }: ExecutiveSummaryProps) {
  const urgent = getTopUrgentFindings(findings, 3);

  return (
    <section className="card grid">
      <h2>{copy.executiveSummary}</h2>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.8rem" }}
      >
        <div
          style={{
            padding: "0.8rem",
            border: "1px solid var(--line)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{copy.overallScore}</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--danger)" }}>
            {SAMPLE_OVERALL_SCORE}
            <span style={{ fontSize: "1rem" }}>/100</span>
          </div>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--danger)" }}>
            {copy.grade}: {SAMPLE_SCORE_GRADE}
          </div>
        </div>
        <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{copy.totalFindings}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{findings.length}</div>
        </div>
        <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{copy.severityLabels.CRITICAL}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
            {countBySeverity(findings, "CRITICAL")}
          </div>
        </div>
        <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{copy.severityLabels.HIGH}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>
            {countBySeverity(findings, "HIGH")}
          </div>
        </div>
        <div style={{ padding: "0.8rem", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{copy.severityLabels.MEDIUM}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warn)" }}>
            {countBySeverity(findings, "MEDIUM")}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{copy.topUrgent}</h3>
        <ol style={{ margin: "0.5rem 0 0", paddingInlineStart: "1.25rem" }}>
          {urgent.map((f) => (
            <li key={f.code} style={{ marginBottom: "0.35rem" }}>
              <strong>{f.title[locale]}</strong> — {copy.severityLabels[f.severity]}
            </li>
          ))}
        </ol>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.75rem" }}>
          <strong>{copy.nextSteps}:</strong>{" "}
          {locale === "fa"
            ? "ابتدا یافته‌های بحرانی و بالا را برطرف کنید، سپس ارزیابی رایگان سایت خود را شروع کنید."
            : "Fix critical and high issues first, then start a free assessment for your own site."}
        </p>
      </div>
    </section>
  );
}