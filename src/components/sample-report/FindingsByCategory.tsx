import type { SampleFinding, SampleLocale, SampleCategory } from "../../lib/sample-report/types";
import type { SampleReportCopy } from "../../lib/sample-report/copy";
import { groupFindingsByCategory } from "../../lib/sample-report/demo-findings";
import FindingCard from "./FindingCard";

type FindingsByCategoryProps = {
  findings: SampleFinding[];
  locale: SampleLocale;
  copy: SampleReportCopy;
};

export default function FindingsByCategory({ findings, locale, copy }: FindingsByCategoryProps) {
  const groups = groupFindingsByCategory(findings);

  return (
    <section className="card grid">
      <h2>{copy.findingsByCategory}</h2>
      {[...groups.entries()].map(([category, group]) => (
        <div key={category}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {copy.categoryLabels[category as SampleCategory]} {copy.findingCount(group.length)}
          </h3>
          <div className="grid" style={{ gap: "0.75rem" }}>
            {group.map((finding) => (
              <FindingCard key={`${category}-${finding.code}`} finding={finding} locale={locale} copy={copy} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}