import type { SampleFinding, SampleLocale } from "../../lib/sample-report/types";
import type { SampleReportCopy } from "../../lib/sample-report/copy";
import { severityBadgeClass } from "./severity-badge";

type FindingCardProps = {
  finding: SampleFinding;
  locale: SampleLocale;
  copy: SampleReportCopy;
};

export default function FindingCard({ finding, locale, copy }: FindingCardProps) {
  return (
    <article className="finding">
      <div className="finding-header">
        <strong>{finding.code}</strong>
        <span className={`badge ${severityBadgeClass(finding.severity)}`}>
          <span className="sr-only">{copy.severitySrPrefix}</span>
          {copy.severityLabels[finding.severity]}
        </span>
        <span className="badge">{copy.categoryLabels[finding.category]}</span>
        <span className="badge">{finding.evidenceType === "hypothesis" ? copy.hypothesis : copy.confirmed}</span>
        <span className="badge">{copy.priority}: {finding.priority ?? "P1"}</span>
      </div>
      <h3 style={{ fontWeight: 600, fontSize: "1rem" }}>{finding.title[locale]}</h3>
      <p>{finding.description[locale]}</p>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        <strong>{copy.evidence}:</strong> {finding.evidence[locale]}
      </p>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        <strong>{copy.impact}:</strong> {finding.impact[locale]}
      </p>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        <strong>{copy.owner}:</strong> {copy.ownerLabels[finding.owner]} |{" "}
        <strong>{copy.difficulty}:</strong> {copy.difficultyLabels[finding.difficulty]}
      </p>
      <p style={{ borderTop: "1px dashed var(--line)", paddingTop: "0.5rem", marginTop: "0.3rem" }}>
        <strong>{copy.recommendation}:</strong> {finding.recommendation[locale]}
      </p>
    </article>
  );
}
