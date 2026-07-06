import type { SampleFinding, SampleLocale } from "../../lib/sample-report/types";
import type { SampleReportCopy } from "../../lib/sample-report/copy";
import { groupFindingsBySeverity } from "../../lib/sample-report/demo-findings";
import FindingCard from "./FindingCard";

type FindingsBySeverityProps = {
  findings: SampleFinding[];
  locale: SampleLocale;
  copy: SampleReportCopy;
};

export default function FindingsBySeverity({ findings, locale, copy }: FindingsBySeverityProps) {
  const groups = groupFindingsBySeverity(findings);

  return (
    <section className="card grid">
      <h2>{copy.findingsBySeverity}</h2>
      {[...groups.entries()].map(([severity, group]) => (
        <div key={severity}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {copy.severityLabels[severity]} {copy.findingCount(group.length)}
          </h3>
          <div className="grid" style={{ gap: "0.75rem" }}>
            {group.map((finding) => (
              <FindingCard key={finding.code} finding={finding} locale={locale} copy={copy} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}