import type { SampleLocale } from "../../lib/sample-report/types";
import { getSampleReportCopy } from "../../lib/sample-report/copy";
import {
  demoFindings,
  securityHeadersChecklist,
  seoBasicsChecklist,
} from "../../lib/sample-report/demo-findings";
import AuditCtaLink from "../AuditCtaLink";
import ChecklistSection from "./ChecklistSection";
import ExecutiveSummary from "./ExecutiveSummary";
import FindingsByCategory from "./FindingsByCategory";
import FindingsBySeverity from "./FindingsBySeverity";
import SampleReportCtaBlock from "./SampleReportCtaBlock";
import TrustDisclaimer from "./TrustDisclaimer";

type SampleReportPageProps = {
  locale: SampleLocale;
};

export default function SampleReportPage({ locale }: SampleReportPageProps) {
  const copy = getSampleReportCopy(locale);

  return (
    <main>
      <section className="card hero">
        <h1>{copy.heroTitle}</h1>
        <p>{copy.heroLead}</p>
        <div className="hero-actions">
          <span className="badge">{copy.demoBadge}</span>
          <AuditCtaLink ctaId="sample_report_audit_start" locale={locale} />
        </div>
      </section>

      <TrustDisclaimer copy={copy} />
      <ExecutiveSummary findings={demoFindings} locale={locale} copy={copy} />

      <ChecklistSection
        title={copy.securityHeaders}
        items={securityHeadersChecklist}
        locale={locale}
        copy={copy}
      />
      <ChecklistSection title={copy.seoStatus} items={seoBasicsChecklist} locale={locale} copy={copy} />

      <FindingsBySeverity findings={demoFindings} locale={locale} copy={copy} />
      <FindingsByCategory findings={demoFindings} locale={locale} copy={copy} />
      <SampleReportCtaBlock locale={locale} copy={copy} />
    </main>
  );
}