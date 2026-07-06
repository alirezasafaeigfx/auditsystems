import type { SampleLocale } from "../../lib/sample-report/types";
import type { SampleReportCopy } from "../../lib/sample-report/copy";
import { getSampleReportCtaIds } from "../../lib/audit-cta-registry";
import AuditCtaLink from "../AuditCtaLink";

type SampleReportCtaBlockProps = {
  locale: SampleLocale;
  copy: SampleReportCopy;
};

export default function SampleReportCtaBlock({ locale, copy }: SampleReportCtaBlockProps) {
  const ctaIds = getSampleReportCtaIds();

  return (
    <section className="card hero">
      <h2>{copy.ctaTitle}</h2>
      <p>{copy.ctaLead}</p>
      <div className="hero-actions">
        {ctaIds.map((id) => (
          <AuditCtaLink key={id} ctaId={id} locale={locale} />
        ))}
      </div>
    </section>
  );
}