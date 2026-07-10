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
      <section className="card grid">
        <h2>{copy.actionPlan}</h2>
        <div className="grid-3">
          <article>
            <strong>{locale === "fa" ? "روز ۱ تا ۷" : "Days 1-7"}</strong>
            <p>{locale === "fa" ? "ریسک‌های P0/P1 امنیت، canonical و خطاهای موبایل را اصلاح و دوباره بررسی کنید." : "Fix P0/P1 security, canonical, and mobile defects, then re-check evidence."}</p>
          </article>
          <article>
            <strong>{locale === "fa" ? "روز ۸ تا ۲۰" : "Days 8-20"}</strong>
            <p>{locale === "fa" ? "فرضیه‌های عملکرد را با lab/field data واقعی تایید کنید و اصلاحات LCP/CLS را اجرا کنید." : "Validate performance hypotheses with real lab/field data and implement LCP/CLS fixes."}</p>
          </article>
          <article>
            <strong>{locale === "fa" ? "روز ۲۱ تا ۳۰" : "Days 21-30"}</strong>
            <p>{locale === "fa" ? "گزارش قبل/بعد، مالک هر اصلاح و monitoring ماهانه را آماده کنید." : "Prepare before/after evidence, owners, and monthly monitoring."}</p>
          </article>
        </div>
      </section>
      <SampleReportCtaBlock locale={locale} copy={copy} />
    </main>
  );
}
